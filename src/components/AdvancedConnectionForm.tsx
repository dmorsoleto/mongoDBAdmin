import { useState, useEffect } from 'react'

// ── Shared UI ───────────────────────────────────────────────────────────────

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-400">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "bg-gray-900 text-gray-200 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 transition-colors"

// ── Types ───────────────────────────────────────────────────────────────────

export interface GeneralFields {
  scheme: 'mongodb' | 'mongodb+srv'
  host: string
  port: string
}

type AuthMethod = 'none' | 'userpass' | 'oidc' | 'x509' | 'kerberos' | 'ldap' | 'aws'
type AuthMechanism = 'default' | 'SCRAM-SHA-1' | 'SCRAM-SHA-256'
type KerberosCanonicalizeHostname = 'none' | 'forward' | 'forward-and-reverse'

export interface AuthFields {
  method: AuthMethod
  // username/password
  username: string
  password: string
  authDatabase: string
  mechanism: AuthMechanism
  // oidc
  oidcUsername: string
  oidcRedirectUri: string
  oidcTrustedEndpoint: boolean
  oidcUseIdToken: boolean
  oidcSendNonce: boolean
  oidcUseAppProxy: boolean
  // ldap
  ldapUsername: string
  ldapPassword: string
  // aws iam
  awsAccessKeyId: string
  awsSecretAccessKey: string
  awsSessionToken: string
  // kerberos
  kerberosPrincipal: string
  kerberosServiceName: string
  kerberosCanonicalizeHostname: KerberosCanonicalizeHostname
  kerberosServiceRealm: string
}

interface Props {
  uri: string
  onChange: (uri: string) => void
}

// ── URI helpers ─────────────────────────────────────────────────────────────

export function getQueryParam(search: string, key: string): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  return params.get(key) ?? ''
}

export function setQueryParam(search: string, key: string, value: string): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  if (value) params.set(key, value)
  else params.delete(key)
  const str = params.toString()
  return str ? '?' + str : ''
}

/** Split URI into { scheme, creds, hostport, path, search } */
export function splitUri(uri: string) {
  const schemeMatch = uri.match(/^(mongodb(?:\+srv)?):\/\//)
  const scheme = schemeMatch?.[1] ?? 'mongodb'
  const rest = uri.replace(/^mongodb(?:\+srv)?:\/\//, '')

  let creds = ''
  let afterCreds = rest
  if (rest.includes('@')) {
    const atIdx = rest.lastIndexOf('@')
    creds = rest.substring(0, atIdx)           // "user:pass"
    afterCreds = rest.substring(atIdx + 1)
  }

  const searchIdx = afterCreds.indexOf('?')
  const pathIdx = afterCreds.indexOf('/')
  let hostport = ''
  let path = ''
  let search = ''

  if (searchIdx >= 0 && (pathIdx < 0 || searchIdx < pathIdx)) {
    hostport = afterCreds.substring(0, searchIdx)
    search = afterCreds.substring(searchIdx)
  } else if (pathIdx >= 0) {
    hostport = afterCreds.substring(0, pathIdx)
    const afterPath = afterCreds.substring(pathIdx)
    const qi = afterPath.indexOf('?')
    if (qi >= 0) { path = afterPath.substring(0, qi); search = afterPath.substring(qi) }
    else path = afterPath
  } else {
    hostport = afterCreds
  }

  return { scheme, creds, hostport, path, search }
}

function joinUri({ scheme, creds, hostport, path, search }: ReturnType<typeof splitUri>) {
  const credsAt = creds ? `${creds}@` : ''
  return `${scheme}://${credsAt}${hostport}${path}${search}`
}

// General ──

function parseGeneralFromUri(uri: string): GeneralFields {
  try {
    const { scheme, hostport } = splitUri(uri)
    const [host, port] = hostport.includes(':') ? hostport.split(':') : [hostport, '']
    return {
      scheme: scheme as GeneralFields['scheme'],
      host: host ?? '',
      port: port ?? '',
    }
  } catch {
    return { scheme: 'mongodb', host: '', port: '' }
  }
}

function buildUriFromGeneral(fields: GeneralFields, uri: string): string {
  const parts = splitUri(uri)
  const { scheme, host, port } = fields
  const hostpart = host
    ? scheme === 'mongodb' && port ? `${host}:${port}` : host
    : scheme === 'mongodb' ? 'localhost:27017' : ''
  return joinUri({ ...parts, scheme, hostport: hostpart })
}

// Auth ──

const EMPTY_AUTH: AuthFields = {
  method: 'userpass',
  username: '', password: '', authDatabase: '', mechanism: 'default',
  oidcUsername: '', oidcRedirectUri: '',
  oidcTrustedEndpoint: false, oidcUseIdToken: false,
  oidcSendNonce: false, oidcUseAppProxy: false,
  ldapUsername: '', ldapPassword: '',
  awsAccessKeyId: '', awsSecretAccessKey: '', awsSessionToken: '',
  kerberosPrincipal: '', kerberosServiceName: '', kerberosCanonicalizeHostname: 'none', kerberosServiceRealm: '',
}

function parseAuthFromUri(uri: string): AuthFields {
  try {
    const { creds, search } = splitUri(uri)
    const rawMech = getQueryParam(search, 'authMechanism')

    if (rawMech === 'MONGODB-AWS') {
      const props = getQueryParam(search, 'authMechanismProperties')
      const getProp = (key: string) => {
        const match = props.match(new RegExp(`${key}:([^,]+)`))
        return match ? match[1] : ''
      }
      return {
        ...EMPTY_AUTH,
        method: 'aws',
        awsAccessKeyId: getProp('AWS_ACCESS_KEY_ID'),
        awsSecretAccessKey: getProp('AWS_SECRET_ACCESS_KEY'),
        awsSessionToken: getProp('AWS_SESSION_TOKEN'),
      }
    }

    if (rawMech === 'PLAIN') {
      const colonIdx = creds.indexOf(':')
      return {
        ...EMPTY_AUTH,
        method: 'ldap',
        ldapUsername: creds ? decodeURIComponent(colonIdx >= 0 ? creds.substring(0, colonIdx) : creds) : '',
        ldapPassword: colonIdx >= 0 ? decodeURIComponent(creds.substring(colonIdx + 1)) : '',
      }
    }

    if (rawMech === 'GSSAPI') {
      const canonicalize = getQueryParam(search, 'authMechanismProperties')
      let kerberosCanonicalizeHostname: KerberosCanonicalizeHostname = 'none'
      if (canonicalize.includes('CANONICALIZE_HOST_NAME:forwardAndReverse')) kerberosCanonicalizeHostname = 'forward-and-reverse'
      else if (canonicalize.includes('CANONICALIZE_HOST_NAME:forward')) kerberosCanonicalizeHostname = 'forward'
      return {
        ...EMPTY_AUTH,
        method: 'kerberos',
        kerberosPrincipal: creds ? decodeURIComponent(creds.split(':')[0]) : '',
        kerberosServiceName: getQueryParam(search, 'authSource'),
        kerberosCanonicalizeHostname,
        kerberosServiceRealm: getQueryParam(search, 'gssapiServiceName'),
      }
    }

    if (rawMech === 'MONGODB-OIDC') {
      return {
        ...EMPTY_AUTH,
        method: 'oidc',
        oidcUsername: creds ? decodeURIComponent(creds.split(':')[0]) : '',
        oidcRedirectUri: getQueryParam(search, 'oidcRedirectUri'),
        oidcTrustedEndpoint: getQueryParam(search, 'oidcTrustedEndpoint') === 'true',
        oidcUseIdToken: getQueryParam(search, 'oidcUseIdToken') === 'true',
        oidcSendNonce: getQueryParam(search, 'oidcSendNonce') === 'true',
        oidcUseAppProxy: getQueryParam(search, 'oidcUseAppProxy') === 'true',
      }
    }

    if (!creds) return { ...EMPTY_AUTH, method: 'userpass' }

    const colonIdx = creds.indexOf(':')
    const username = decodeURIComponent(colonIdx >= 0 ? creds.substring(0, colonIdx) : creds)
    const password = colonIdx >= 0 ? decodeURIComponent(creds.substring(colonIdx + 1)) : ''
    const authDatabase = getQueryParam(search, 'authSource')
    const mechanism: AuthMechanism = ['SCRAM-SHA-1', 'SCRAM-SHA-256'].includes(rawMech)
      ? (rawMech as AuthMechanism) : 'default'

    return { ...EMPTY_AUTH, method: 'userpass', username, password, authDatabase, mechanism }
  } catch {
    return { ...EMPTY_AUTH }
  }
}

function buildUriFromAuth(fields: AuthFields, uri: string): string {
  const parts = splitUri(uri)
  const ALL_AUTH_PARAMS = ['authMechanism', 'authSource', 'oidcRedirectUri', 'oidcTrustedEndpoint', 'oidcUseIdToken', 'oidcSendNonce', 'oidcUseAppProxy', 'authMechanismProperties', 'gssapiServiceName', 'authMechanismProperties']

  // Clear all auth-related params first
  for (const p of ALL_AUTH_PARAMS) parts.search = setQueryParam(parts.search, p, '')
  parts.creds = ''

  if (fields.method === 'none') return joinUri(parts)

  if (fields.method === 'userpass') {
    const { username, password, authDatabase, mechanism } = fields
    parts.creds = password
      ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}`
      : encodeURIComponent(username)
    parts.search = setQueryParam(parts.search, 'authSource', authDatabase)
    parts.search = setQueryParam(parts.search, 'authMechanism', mechanism === 'default' ? '' : mechanism)
    return joinUri(parts)
  }

  // aws iam
  if (fields.method === 'aws') {
    const { awsAccessKeyId, awsSecretAccessKey, awsSessionToken } = fields
    parts.search = setQueryParam(parts.search, 'authMechanism', 'MONGODB-AWS')
    const props = [
      awsAccessKeyId     ? `AWS_ACCESS_KEY_ID:${awsAccessKeyId}` : '',
      awsSecretAccessKey ? `AWS_SECRET_ACCESS_KEY:${awsSecretAccessKey}` : '',
      awsSessionToken    ? `AWS_SESSION_TOKEN:${awsSessionToken}` : '',
    ].filter(Boolean).join(',')
    if (props) parts.search = setQueryParam(parts.search, 'authMechanismProperties', props)
    return joinUri(parts)
  }

  // ldap
  if (fields.method === 'ldap') {
    const ldapUsername = fields.ldapUsername ?? ''
    const ldapPassword = fields.ldapPassword ?? ''
    parts.creds = ldapPassword
      ? `${encodeURIComponent(ldapUsername)}:${encodeURIComponent(ldapPassword)}`
      : encodeURIComponent(ldapUsername)
    parts.search = setQueryParam(parts.search, 'authMechanism', 'PLAIN')
    return joinUri(parts)
  }

  // kerberos
  if (fields.method === 'kerberos') {
    const { kerberosPrincipal, kerberosServiceName, kerberosCanonicalizeHostname, kerberosServiceRealm } = fields
    if (kerberosPrincipal) parts.creds = encodeURIComponent(kerberosPrincipal)
    parts.search = setQueryParam(parts.search, 'authMechanism', 'GSSAPI')
    if (kerberosServiceName) parts.search = setQueryParam(parts.search, 'authSource', kerberosServiceName)
    if (kerberosServiceRealm) parts.search = setQueryParam(parts.search, 'gssapiServiceName', kerberosServiceRealm)
    if (kerberosCanonicalizeHostname !== 'none') {
      const val = kerberosCanonicalizeHostname === 'forward-and-reverse' ? 'forwardAndReverse' : 'forward'
      parts.search = setQueryParam(parts.search, 'authMechanismProperties', `CANONICALIZE_HOST_NAME:${val}`)
    }
    return joinUri(parts)
  }

  // oidc
  if (fields.oidcUsername) parts.creds = encodeURIComponent(fields.oidcUsername)
  parts.search = setQueryParam(parts.search, 'authMechanism', 'MONGODB-OIDC')
  parts.search = setQueryParam(parts.search, 'oidcRedirectUri', fields.oidcRedirectUri)
  parts.search = setQueryParam(parts.search, 'oidcTrustedEndpoint', fields.oidcTrustedEndpoint ? 'true' : '')
  parts.search = setQueryParam(parts.search, 'oidcUseIdToken', fields.oidcUseIdToken ? 'true' : '')
  parts.search = setQueryParam(parts.search, 'oidcSendNonce', fields.oidcSendNonce ? 'true' : '')
  parts.search = setQueryParam(parts.search, 'oidcUseAppProxy', fields.oidcUseAppProxy ? 'true' : '')
  return joinUri(parts)
}

// ── General tab ─────────────────────────────────────────────────────────────

interface GeneralTabProps { fields: GeneralFields; onChange: (f: GeneralFields) => void }

function GeneralTab({ fields, onChange }: GeneralTabProps) {
  const set = (patch: Partial<GeneralFields>) => onChange({ ...fields, ...patch })
  return (
    <div className="space-y-4">
      <LabeledField label="Connection String Scheme">
        <div className="flex gap-2">
          {(['mongodb', 'mongodb+srv'] as const).map(scheme => (
            <button
              key={scheme}
              type="button"
              onClick={() => set({ scheme, port: scheme === 'mongodb+srv' ? '' : fields.port || '27017' })}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-mono font-medium border transition-colors ${fields.scheme === scheme
                ? 'bg-gray-600 border-gray-400 text-white'
                : 'bg-gray-900 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                }`}
            >
              {scheme}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-600">
          {fields.scheme === 'mongodb+srv'
            ? 'Use for Atlas and services with DNS SRV records. Port is not required.'
            : 'Standard connection. Host and port required.'}
        </p>
      </LabeledField>

      <div className="flex gap-3">
        <div className="flex-1">
          <LabeledField label="Host">
            <input
              type="text"
              value={fields.host}
              onChange={e => set({ host: e.target.value })}
              placeholder={fields.scheme === 'mongodb+srv' ? 'cluster.mongodb.net' : 'localhost'}
              className={`w-full ${inputCls}`}
              spellCheck={false}
            />
          </LabeledField>
        </div>
        {fields.scheme === 'mongodb' && (
          <div className="w-28">
            <LabeledField label="Port">
              <input
                type="number"
                value={fields.port}
                onChange={e => set({ port: e.target.value })}
                placeholder="27017"
                min={1}
                max={65535}
                className={`w-full ${inputCls}`}
              />
            </LabeledField>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Authentication tab ───────────────────────────────────────────────────────

interface AuthTabProps { fields: AuthFields; onChange: (f: AuthFields) => void }

const AUTH_METHODS: { value: AuthMethod; label: string }[] = [
  { value: 'userpass', label: 'Username / Password' },
  { value: 'oidc',     label: 'OIDC' },
  { value: 'x509',     label: 'X.509' },
  { value: 'kerberos', label: 'Kerberos' },
  { value: 'ldap',     label: 'LDAP' },
  { value: 'aws',      label: 'AWS IAM' },
]

const CANONICALIZE_OPTIONS: { value: KerberosCanonicalizeHostname; label: string }[] = [
  { value: 'none',              label: 'None' },
  { value: 'forward',           label: 'Forward' },
  { value: 'forward-and-reverse', label: 'Forward and Reverse' },
]

const MECHANISMS: { value: AuthMechanism; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'SCRAM-SHA-1', label: 'SCRAM-SHA-1' },
  { value: 'SCRAM-SHA-256', label: 'SCRAM-SHA-256' },
]

function AuthTab({ fields, onChange }: AuthTabProps) {
  const set = (patch: Partial<AuthFields>) => onChange({ ...fields, ...patch })

  return (
    <div className="space-y-4">
      <LabeledField label="Authentication Method">
        <div className="flex gap-2">
          {AUTH_METHODS.map(m => (
            <button
              key={m.value}
              type="button"
              onClick={() => set({ method: m.value })}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${fields.method === m.value
                ? 'bg-gray-600 border-gray-400 text-white'
                : 'bg-gray-900 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </LabeledField>

      {fields.method === 'oidc' && (
        <div className="space-y-4">
          <LabeledField label="Username">
            <input
              type="text"
              value={fields.oidcUsername}
              onChange={e => set({ oidcUsername: e.target.value })}
              placeholder="Optional"
              className={`w-full ${inputCls}`}
              autoComplete="off"
              spellCheck={false}
            />
          </LabeledField>

          <LabeledField label="Auth Code Flow Redirect URI">
            <input
              type="text"
              value={fields.oidcRedirectUri}
              onChange={e => set({ oidcRedirectUri: e.target.value })}
              placeholder="http://localhost:27097/redirect"
              className={`w-full ${inputCls} font-mono`}
              spellCheck={false}
            />
          </LabeledField>

          <div className="space-y-3 pt-1">
            {([
              {
                key: 'oidcTrustedEndpoint',
                label: 'Consider Target Endpoint Trusted',
                disclaimer: 'Allow connecting when the target endpoint is not in the list of endpoints that are considered trusted by default. Only use this option when connecting to servers that you trust.',
              },
              {
                key: 'oidcUseIdToken',
                label: 'Use ID Token instead of Access Token',
                disclaimer: 'Use ID tokens instead of access tokens to work around misconfigured or broken identity providers. This will only work if the server is configured correspondingly.'
              },
              {
                key: 'oidcSendNonce',
                label: 'Send a Nonce in the Auth Code Request',
                disclaimer: 'Include a random nonce as part of the auth code request to prevent replay attacks. This should only be disabled in cases where the OIDC provider doesn\'t support it as the nonce is an important security component.'
              },
              {
                key: 'oidcUseAppProxy',
                label: 'Use Application-Level Proxy Settings',
                disclaimer: 'Use the application-level proxy settings for communicating with the identity provider. If not chosen, the same proxy (if any) is used for connecting to both the cluster and the identity provider.'
              },
            ] as { key: keyof AuthFields; label: string; disclaimer?: string }[]).map(({ key, label, disclaimer }) => (
              <div key={key}>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div
                    onClick={() => set({ [key]: !fields[key] } as Partial<AuthFields>)}
                    className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${fields[key]
                      ? 'bg-green-600 border-green-600'
                      : 'bg-gray-900 border-gray-600 group-hover:border-gray-400'
                      }`}
                  >
                    {fields[key] && (
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span
                    onClick={() => set({ [key]: !fields[key] } as Partial<AuthFields>)}
                    className="text-sm text-gray-300 group-hover:text-white transition-colors select-none"
                  >
                    {label}
                  </span>
                </label>
                {disclaimer && (
                  <p className="mt-1.5 ml-7 text-[11px] text-gray-600 leading-relaxed">
                    {disclaimer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {fields.method === 'userpass' && (
        <>
          <div className="flex gap-3">
            <div className="flex-1">
              <LabeledField label="Username">
                <input
                  type="text"
                  value={fields.username}
                  onChange={e => set({ username: e.target.value })}
                  placeholder="admin"
                  className={`w-full ${inputCls}`}
                  autoComplete="off"
                  spellCheck={false}
                />
              </LabeledField>
            </div>
            <div className="flex-1">
              <LabeledField label="Password">
                <input
                  type="password"
                  value={fields.password}
                  onChange={e => set({ password: e.target.value })}
                  placeholder="••••••••"
                  className={`w-full ${inputCls}`}
                  autoComplete="new-password"
                />
              </LabeledField>
            </div>
          </div>

          <LabeledField label="Authentication Database">
            <input
              type="text"
              value={fields.authDatabase}
              onChange={e => set({ authDatabase: e.target.value })}
              placeholder="admin"
              className={`w-full ${inputCls}`}
              spellCheck={false}
            />
            <p className="text-[11px] text-gray-600">
              The database where the user was created. Usually <span className="font-mono text-gray-500">admin</span>.
            </p>
          </LabeledField>

          <LabeledField label="Authentication Mechanism">
            <div className="flex gap-2 flex-wrap">
              {MECHANISMS.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => set({ mechanism: m.value })}
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${fields.mechanism === m.value
                    ? 'bg-gray-600 border-gray-400 text-white'
                    : 'bg-gray-900 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                    }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-600">
              {fields.mechanism === 'default' && 'The driver negotiates the best mechanism available.'}
              {fields.mechanism === 'SCRAM-SHA-1' && 'Required for MongoDB 3.x and Amazon DocumentDB.'}
              {fields.mechanism === 'SCRAM-SHA-256' && 'Recommended for MongoDB 4.0+.'}
            </p>
          </LabeledField>
        </>
      )}

      {fields.method === 'x509' && (
        <div className="flex items-start gap-3 bg-yellow-950/40 border border-yellow-800/40 rounded-lg px-4 py-3">
          <svg className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-yellow-700 leading-relaxed">
            X.509 Authentication type requires a Client Certificate to work. Make sure to enable TLS and add one in the TLS/SSL tab.
          </p>
        </div>
      )}

      {fields.method === 'ldap' && (
        <div className="space-y-4">
          <LabeledField label="Username">
            <input
              type="text"
              value={fields.ldapUsername ?? ''}
              onChange={e => set({ ldapUsername: e.target.value })}
              placeholder="cn=admin,dc=example,dc=com"
              className={`w-full ${inputCls}`}
              autoComplete="off"
              spellCheck={false}
            />
          </LabeledField>

          <LabeledField label="Password">
            <input
              type="password"
              value={fields.ldapPassword ?? ''}
              onChange={e => set({ ldapPassword: e.target.value })}
              placeholder="••••••••"
              className={`w-full ${inputCls}`}
              autoComplete="new-password"
            />
          </LabeledField>
        </div>
      )}

      {fields.method === 'kerberos' && (
        <div className="space-y-4">
          <LabeledField label="Principal">
            <input
              type="text"
              value={fields.kerberosPrincipal}
              onChange={e => set({ kerberosPrincipal: e.target.value })}
              placeholder="user@REALM.COM"
              className={`w-full ${inputCls} font-mono`}
              autoComplete="off"
              spellCheck={false}
            />
          </LabeledField>

          <LabeledField label="Service Name">
            <input
              type="text"
              value={fields.kerberosServiceName}
              onChange={e => set({ kerberosServiceName: e.target.value })}
              placeholder="mongodb"
              className={`w-full ${inputCls}`}
              spellCheck={false}
            />
          </LabeledField>

          <LabeledField label="Canonicalize Host Name">
            <div className="flex gap-2">
              {CANONICALIZE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set({ kerberosCanonicalizeHostname: opt.value })}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${fields.kerberosCanonicalizeHostname === opt.value
                    ? 'bg-gray-600 border-gray-400 text-white'
                    : 'bg-gray-900 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </LabeledField>

          <LabeledField label="Service Realm">
            <input
              type="text"
              value={fields.kerberosServiceRealm}
              onChange={e => set({ kerberosServiceRealm: e.target.value })}
              placeholder="REALM.COM"
              className={`w-full ${inputCls}`}
              spellCheck={false}
            />
          </LabeledField>
        </div>
      )}

      {fields.method === 'aws' && (
        <div className="space-y-4">
          <LabeledField label="AWS Access Key ID">
            <input
              type="text"
              value={fields.awsAccessKeyId ?? ''}
              onChange={e => set({ awsAccessKeyId: e.target.value })}
              placeholder="AKIAIOSFODNN7EXAMPLE"
              className={`w-full ${inputCls} font-mono`}
              autoComplete="off"
              spellCheck={false}
            />
          </LabeledField>

          <LabeledField label="AWS Secret Access Key">
            <input
              type="password"
              value={fields.awsSecretAccessKey ?? ''}
              onChange={e => set({ awsSecretAccessKey: e.target.value })}
              placeholder="••••••••"
              className={`w-full ${inputCls}`}
              autoComplete="new-password"
            />
          </LabeledField>

          <LabeledField label="AWS Session Token">
            <input
              type="text"
              value={fields.awsSessionToken ?? ''}
              onChange={e => set({ awsSessionToken: e.target.value })}
              placeholder="Optional — for temporary credentials"
              className={`w-full ${inputCls} font-mono`}
              autoComplete="off"
              spellCheck={false}
            />
          </LabeledField>
        </div>
      )}
    </div>
  )
}

// ── TLS/SSL tab ─────────────────────────────────────────────────────────────

type TlsMode = 'default' | 'on' | 'off'

export interface TlsFields {
  mode: TlsMode
  caFile: string
  certFile: string
  certKeyPassword: string
  tlsInsecure: boolean
  tlsAllowInvalidHostnames: boolean
  tlsAllowInvalidCertificates: boolean
}

const EMPTY_TLS: TlsFields = {
  mode: 'default',
  caFile: '', certFile: '', certKeyPassword: '',
  tlsInsecure: false, tlsAllowInvalidHostnames: false, tlsAllowInvalidCertificates: false,
}

function parseTlsFromUri(uri: string): TlsFields {
  try {
    const { search } = splitUri(uri)
    const tls = getQueryParam(search, 'tls')
    const mode: TlsMode = tls === 'true' ? 'on' : tls === 'false' ? 'off' : 'default'
    return {
      mode,
      caFile: getQueryParam(search, 'tlsCertificateAuthorityFile'),
      certFile: getQueryParam(search, 'tlsCertificateKeyFile'),
      certKeyPassword: getQueryParam(search, 'tlsCertificateKeyFilePassword'),
      tlsInsecure: getQueryParam(search, 'tlsInsecure') === 'true',
      tlsAllowInvalidHostnames: getQueryParam(search, 'tlsAllowInvalidHostnames') === 'true',
      tlsAllowInvalidCertificates: getQueryParam(search, 'tlsAllowInvalidCertificates') === 'true',
    }
  } catch {
    return { ...EMPTY_TLS }
  }
}

function buildUriFromTls(fields: TlsFields, uri: string): string {
  const parts = splitUri(uri)
  const TLS_PARAMS = ['tls', 'tlsCertificateAuthorityFile', 'tlsCertificateKeyFile', 'tlsCertificateKeyFilePassword', 'tlsInsecure', 'tlsAllowInvalidHostnames', 'tlsAllowInvalidCertificates']
  for (const p of TLS_PARAMS) parts.search = setQueryParam(parts.search, p, '')

  if (fields.mode !== 'default') parts.search = setQueryParam(parts.search, 'tls', fields.mode === 'on' ? 'true' : 'false')
  parts.search = setQueryParam(parts.search, 'tlsCertificateAuthorityFile', fields.caFile)
  parts.search = setQueryParam(parts.search, 'tlsCertificateKeyFile', fields.certFile)
  parts.search = setQueryParam(parts.search, 'tlsCertificateKeyFilePassword', fields.certKeyPassword)
  if (fields.tlsInsecure) parts.search = setQueryParam(parts.search, 'tlsInsecure', 'true')
  if (fields.tlsAllowInvalidHostnames) parts.search = setQueryParam(parts.search, 'tlsAllowInvalidHostnames', 'true')
  if (fields.tlsAllowInvalidCertificates) parts.search = setQueryParam(parts.search, 'tlsAllowInvalidCertificates', 'true')
  return joinUri(parts)
}

function FilePickerField({ label, value, onChange, hint, accept = '.pem' }: {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
  accept?: string
}) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Tauri exposes the real disk path on the File object
    const path = (file as unknown as { path?: string }).path
    onChange(path ?? file.name)
    e.target.value = ''
  }

  return (
    <LabeledField label={label}>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="/path/to/file.pem"
          className={`flex-1 ${inputCls} font-mono text-xs`}
          spellCheck={false}
        />
        <label className="shrink-0 cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-600 bg-gray-900 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors">
          Browse
          <input type="file" accept={accept} className="hidden" onChange={handleFile} />
        </label>
      </div>
      {hint && <p className="text-[11px] text-gray-600">{hint}</p>}
    </LabeledField>
  )
}

interface TlsTabProps { fields: TlsFields; onChange: (f: TlsFields) => void }

function TlsTab({ fields, onChange }: TlsTabProps) {
  const set = (patch: Partial<TlsFields>) => onChange({ ...fields, ...patch })

  const TLS_MODES: { value: TlsMode; label: string }[] = [
    { value: 'default', label: 'Default' },
    { value: 'on',      label: 'On' },
    { value: 'off',     label: 'Off' },
  ]

  const CHECKBOXES: { key: keyof TlsFields; label: string; disclaimer: string }[] = [
    {
      key: 'tlsInsecure',
      label: 'tlsInsecure',
      disclaimer: 'Disables all TLS certificate validation. Not recommended for production use.',
    },
    {
      key: 'tlsAllowInvalidHostnames',
      label: 'tlsAllowInvalidHostnames',
      disclaimer: 'Disables hostname verification in TLS handshake. Use only in trusted environments.',
    },
    {
      key: 'tlsAllowInvalidCertificates',
      label: 'tlsAllowInvalidCertificates',
      disclaimer: 'Allows connecting to servers with invalid TLS certificates.',
    },
  ]

  return (
    <div className="space-y-5">
      <LabeledField label="SSL/TLS Connection">
        <div className="flex gap-2">
          {TLS_MODES.map(m => (
            <button
              key={m.value}
              type="button"
              onClick={() => set({ mode: m.value })}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${fields.mode === m.value
                ? 'bg-gray-600 border-gray-400 text-white'
                : 'bg-gray-900 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-600">
          {fields.mode === 'default' && 'Uses the default TLS behavior for the connection scheme.'}
          {fields.mode === 'on'      && 'Forces TLS on. Required for Atlas and most cloud providers.'}
          {fields.mode === 'off'     && 'Disables TLS. Only use on trusted local networks.'}
        </p>
      </LabeledField>

      <FilePickerField
        label="Certificate Authority (.pem)"
        value={fields.caFile}
        onChange={v => set({ caFile: v })}
        hint="Path to a PEM file with one or more certificate authorities to trust."
      />

      <FilePickerField
        label="Client Certificate and Key (.pem)"
        value={fields.certFile}
        onChange={v => set({ certFile: v })}
        hint="Path to a PEM file containing the client certificate and private key."
      />

      <LabeledField label="Client Key Password">
        <input
          type="password"
          value={fields.certKeyPassword}
          onChange={e => set({ certKeyPassword: e.target.value })}
          placeholder="Leave blank if the key is unencrypted"
          className={`w-full ${inputCls}`}
          autoComplete="new-password"
        />
      </LabeledField>

      <div className="space-y-3 pt-1">
        {CHECKBOXES.map(({ key, label, disclaimer }) => (
          <div key={key}>
            <label className="flex items-start gap-3 cursor-pointer group">
              <div
                onClick={() => set({ [key]: !fields[key] } as Partial<TlsFields>)}
                className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${fields[key]
                  ? 'bg-green-600 border-green-600'
                  : 'bg-gray-900 border-gray-600 group-hover:border-gray-400'
                  }`}
              >
                {fields[key] && (
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span
                onClick={() => set({ [key]: !fields[key] } as Partial<TlsFields>)}
                className="text-sm font-mono text-gray-300 group-hover:text-white transition-colors select-none"
              >
                {label}
              </span>
            </label>
            <p className="mt-1.5 ml-7 text-[11px] text-gray-600 leading-relaxed">{disclaimer}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Proxy/SSH tab ────────────────────────────────────────────────────────────

type SshMethod = 'none' | 'password' | 'identity' | 'socks5' | 'app-proxy'

export interface ProxyFields {
  sshMethod: SshMethod
  sshHostname: string
  sshPort: string
  sshUsername: string
  sshPassword: string
  sshIdentityFile: string
  sshPassphrase: string
  proxyHostname: string
  proxyPort: string
  proxyUsername: string
  proxyPassword: string
}

const EMPTY_PROXY: ProxyFields = {
  sshMethod: 'none',
  sshHostname: '', sshPort: '', sshUsername: '', sshPassword: '',
  sshIdentityFile: '', sshPassphrase: '',
  proxyHostname: '', proxyPort: '', proxyUsername: '', proxyPassword: '',
}

// SSH params are stored as custom _ssh* query params (non-standard, stripped before driver use)
function parseProxyFromUri(uri: string): ProxyFields {
  try {
    const { search } = splitUri(uri)
    const method = getQueryParam(search, '_sshMethod') as SshMethod
    if (!method || method === 'none') return { ...EMPTY_PROXY }
    return {
      sshMethod: method,
      sshHostname: getQueryParam(search, '_sshHostname'),
      sshPort: getQueryParam(search, '_sshPort'),
      sshUsername: getQueryParam(search, '_sshUsername'),
      sshPassword: getQueryParam(search, '_sshPassword'),
      sshIdentityFile: getQueryParam(search, '_sshIdentityFile'),
      sshPassphrase: getQueryParam(search, '_sshPassphrase'),
      proxyHostname: getQueryParam(search, '_proxyHostname'),
      proxyPort: getQueryParam(search, '_proxyPort'),
      proxyUsername: getQueryParam(search, '_proxyUsername'),
      proxyPassword: getQueryParam(search, '_proxyPassword'),
    }
  } catch {
    return { ...EMPTY_PROXY }
  }
}

function buildUriFromProxy(fields: ProxyFields, uri: string): string {
  const parts = splitUri(uri)
  const SSH_PARAMS = ['_sshMethod', '_sshHostname', '_sshPort', '_sshUsername', '_sshPassword', '_sshIdentityFile', '_sshPassphrase', '_proxyHostname', '_proxyPort', '_proxyUsername', '_proxyPassword']
  for (const p of SSH_PARAMS) parts.search = setQueryParam(parts.search, p, '')

  if (fields.sshMethod === 'none') return joinUri(parts)

  parts.search = setQueryParam(parts.search, '_sshMethod', fields.sshMethod)
  parts.search = setQueryParam(parts.search, '_sshHostname', fields.sshHostname)
  parts.search = setQueryParam(parts.search, '_sshPort', fields.sshPort)
  parts.search = setQueryParam(parts.search, '_sshUsername', fields.sshUsername)
  if (fields.sshMethod === 'password') {
    parts.search = setQueryParam(parts.search, '_sshPassword', fields.sshPassword)
  } else if (fields.sshMethod === 'identity') {
    parts.search = setQueryParam(parts.search, '_sshIdentityFile', fields.sshIdentityFile)
    parts.search = setQueryParam(parts.search, '_sshPassphrase', fields.sshPassphrase)
  } else if (fields.sshMethod === 'socks5') {
    parts.search = setQueryParam(parts.search, '_proxyHostname', fields.proxyHostname)
    parts.search = setQueryParam(parts.search, '_proxyPort', fields.proxyPort)
    parts.search = setQueryParam(parts.search, '_proxyUsername', fields.proxyUsername)
    parts.search = setQueryParam(parts.search, '_proxyPassword', fields.proxyPassword)
  }
  return joinUri(parts)
}

interface ProxyTabProps { fields: ProxyFields; onChange: (f: ProxyFields) => void }

function ProxyTab({ fields, onChange }: ProxyTabProps) {
  const set = (patch: Partial<ProxyFields>) => onChange({ ...fields, ...patch })

  const SSH_METHODS: { value: SshMethod; label: string }[] = [
    { value: 'none',     label: 'None' },
    { value: 'password', label: 'SSH With Password' },
    { value: 'identity', label: 'SSH With Identity File' },
    { value: 'socks5',     label: 'Socks5' },
    { value: 'app-proxy', label: 'Application-level Proxy' },
  ]

  return (
    <div className="space-y-5">
      <LabeledField label="SSH Tunnel / Proxy Method">
        <div className="flex gap-2">
          {SSH_METHODS.map(m => (
            <button
              key={m.value}
              type="button"
              onClick={() => set({ sshMethod: m.value })}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${fields.sshMethod === m.value
                ? 'bg-gray-600 border-gray-400 text-white'
                : 'bg-gray-900 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </LabeledField>

      {(fields.sshMethod === 'password' || fields.sshMethod === 'identity') && (
        <div className="space-y-4">
          {/* Common fields */}
          <div className="flex gap-3">
            <div className="flex-1">
              <LabeledField label="SSH Hostname">
                <input
                  type="text"
                  value={fields.sshHostname ?? ''}
                  onChange={e => set({ sshHostname: e.target.value })}
                  placeholder="bastion.example.com"
                  className={`w-full ${inputCls}`}
                  spellCheck={false}
                />
              </LabeledField>
            </div>
            <div className="w-28">
              <LabeledField label="SSH Port">
                <input
                  type="number"
                  value={fields.sshPort ?? ''}
                  onChange={e => set({ sshPort: e.target.value })}
                  placeholder="22"
                  min={1}
                  max={65535}
                  className={`w-full ${inputCls}`}
                />
              </LabeledField>
            </div>
          </div>

          <LabeledField label="SSH Username">
            <input
              type="text"
              value={fields.sshUsername ?? ''}
              onChange={e => set({ sshUsername: e.target.value })}
              placeholder="ubuntu"
              className={`w-full ${inputCls}`}
              autoComplete="off"
              spellCheck={false}
            />
          </LabeledField>

          {/* Password-specific */}
          {fields.sshMethod === 'password' && (
            <LabeledField label="SSH Password">
              <input
                type="password"
                value={fields.sshPassword ?? ''}
                onChange={e => set({ sshPassword: e.target.value })}
                placeholder="••••••••"
                className={`w-full ${inputCls}`}
                autoComplete="new-password"
              />
            </LabeledField>
          )}

          {/* Identity file-specific */}
          {fields.sshMethod === 'identity' && (
            <>
              <FilePickerField
                label="SSH Identity File"
                value={fields.sshIdentityFile ?? ''}
                onChange={v => set({ sshIdentityFile: v })}
                hint="Path to the private key file (e.g. ~/.ssh/id_rsa)."
                accept="*"
              />

              <LabeledField label="SSH Passphrase">
                <input
                  type="password"
                  value={fields.sshPassphrase ?? ''}
                  onChange={e => set({ sshPassphrase: e.target.value })}
                  placeholder="Leave blank if the key has no passphrase"
                  className={`w-full ${inputCls}`}
                  autoComplete="new-password"
                />
              </LabeledField>
            </>
          )}
        </div>
      )}

      {fields.sshMethod === 'socks5' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <LabeledField label="Proxy Hostname">
                <input
                  type="text"
                  value={fields.proxyHostname ?? ''}
                  onChange={e => set({ proxyHostname: e.target.value })}
                  placeholder="proxy.example.com"
                  className={`w-full ${inputCls}`}
                  spellCheck={false}
                />
              </LabeledField>
            </div>
            <div className="w-28">
              <LabeledField label="Proxy Tunnel Port">
                <input
                  type="number"
                  value={fields.proxyPort ?? ''}
                  onChange={e => set({ proxyPort: e.target.value })}
                  placeholder="1080"
                  min={1}
                  max={65535}
                  className={`w-full ${inputCls}`}
                />
              </LabeledField>
            </div>
          </div>

          <LabeledField label="Proxy Username">
            <input
              type="text"
              value={fields.proxyUsername ?? ''}
              onChange={e => set({ proxyUsername: e.target.value })}
              placeholder="Optional"
              className={`w-full ${inputCls}`}
              autoComplete="off"
              spellCheck={false}
            />
          </LabeledField>

          <LabeledField label="Proxy Password">
            <input
              type="password"
              value={fields.proxyPassword ?? ''}
              onChange={e => set({ proxyPassword: e.target.value })}
              placeholder="Optional"
              className={`w-full ${inputCls}`}
              autoComplete="new-password"
            />
          </LabeledField>
        </div>
      )}

      {fields.sshMethod === 'app-proxy' && (
        <div className="flex items-start gap-3 bg-gray-900/60 border border-gray-700 rounded-lg px-4 py-3">
          <svg className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-gray-400 leading-relaxed">
            Use the application-level proxy settings for communicating with the cluster.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main export ─────────────────────────────────────────────────────────────

const TABS = ['General', 'Authentication', 'TLS/SSL', 'Proxy/SSH'] as const
type Tab = typeof TABS[number]

export function AdvancedConnectionForm({ uri, onChange }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('General')
  const [general, setGeneral] = useState<GeneralFields>(() => parseGeneralFromUri(uri))
  const [auth, setAuth] = useState<AuthFields>(() => parseAuthFromUri(uri))
  const [tls, setTls] = useState<TlsFields>(() => parseTlsFromUri(uri))
  const [proxy, setProxy] = useState<ProxyFields>(() => parseProxyFromUri(uri))

  useEffect(() => {
    setGeneral(parseGeneralFromUri(uri))
    setAuth(parseAuthFromUri(uri))
    setTls(parseTlsFromUri(uri))
    setProxy(parseProxyFromUri(uri))
  }, [uri])

  const handleGeneralChange = (fields: GeneralFields) => {
    setGeneral(fields)
    onChange(buildUriFromGeneral(fields, uri))
  }

  const handleAuthChange = (fields: AuthFields) => {
    setAuth(fields)
    onChange(buildUriFromAuth(fields, uri))
  }

  const handleTlsChange = (fields: TlsFields) => {
    setTls(fields)
    onChange(buildUriFromTls(fields, uri))
  }

  const handleProxyChange = (fields: ProxyFields) => {
    setProxy(fields)
    onChange(buildUriFromProxy(fields, uri))
  }

  return (
    <div className="rounded-lg border border-gray-700 overflow-hidden">
      {/* Tab bar */}
      <div className="flex bg-gray-900 border-b border-gray-700">
        {TABS.map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 ${activeTab === tab
              ? 'border-green-500 text-white bg-gray-800'
              : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4 bg-gray-800/50">
        {activeTab === 'General' && <GeneralTab fields={general} onChange={handleGeneralChange} />}
        {activeTab === 'Authentication' && <AuthTab fields={auth} onChange={handleAuthChange} />}
        {activeTab === 'TLS/SSL' && <TlsTab fields={tls} onChange={handleTlsChange} />}
        {activeTab === 'Proxy/SSH' && <ProxyTab fields={proxy} onChange={handleProxyChange} />}
      </div>
    </div>
  )
}
