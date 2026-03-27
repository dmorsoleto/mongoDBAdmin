import { useState, useEffect, useCallback } from 'react'
import { SettingsModal } from './SettingsModal'
import { useStore } from '../store'
import { db as dbApi, connections as connectionsApi, environments as environmentsApi } from '../lib/tauri'
import {
  Database, Plug, Trash2, Plus, Loader2, ServerCrash,
  Pencil, X, Check, AlertTriangle, ChevronDown, Layers, SlidersHorizontal, Link, Settings,
} from 'lucide-react'
import { AdvancedConnectionForm } from './AdvancedConnectionForm'

interface SavedConnection {
  name: string
  uri: string
  environment: string
}

type FormMode = 'new' | 'edit'

// ── URI warning helper ─────────────────────────────────────────────────────

export function detectUriWarnings(uri: string): string[] {
  const warnings: string[] = []
  try {
    const match = uri.match(/^mongodb(?:\+srv)?:\/\/([^@]+)@/)
    if (match) {
      const userInfo = match[1]
      if (userInfo.includes('%20'))
        warnings.push('A URI contém "%20" nas credenciais — isso é um espaço em branco codificado e provavelmente está errado. Remova o "%20" da senha.')
      const others = [...new Set((userInfo.match(/%[0-9A-Fa-f]{2}/g) ?? []).filter(c => c !== '%20'))]
      if (others.length > 0)
        warnings.push(`A URI contém caracteres URL-encoded nas credenciais: ${others.join(', ')}.`)
    }
  } catch { /* ignore */ }
  return warnings
}

// ── New Environment Modal ──────────────────────────────────────────────────

function NewEnvironmentModal({ onClose, onSave }: { onClose: () => void; onSave: (name: string) => void }) {
  const [value, setValue] = useState('')

  const handleSave = () => {
    const name = value.trim()
    if (!name) return
    onSave(name)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-80 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">New Environment</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <input
          autoFocus
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose() }}
          placeholder="e.g. production, staging, dev"
          className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 transition-colors"
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!value.trim()}
            className="flex-1 text-sm font-medium text-white bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded-lg transition-colors"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function Connections() {
  const { setConnected, setDatabases } = useStore()

  // Environments
  const [envList, setEnvList] = useState<string[]>([])
  const [selectedEnv, setSelectedEnv] = useState<string | null>(
    () => localStorage.getItem('lastEnvironment')
  )
  const [envModalOpen, setEnvModalOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const selectEnv = (env: string | null) => {
    setSelectedEnv(env)
    if (env) localStorage.setItem('lastEnvironment', env)
    else localStorage.removeItem('lastEnvironment')
  }

  // Connections
  const [allConns, setAllConns] = useState<SavedConnection[]>([])

  // Form
  const [inputMode, setInputMode] = useState<'uri' | 'advanced'>('uri')
  const [mode, setMode] = useState<FormMode>('new')
  const [editingOriginalName, setEditingOriginalName] = useState('')
  const [uri, setUri] = useState('mongodb://localhost:27017')
  const [connName, setConnName] = useState('')

  // UI state
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [connectingName, setConnectingName] = useState<string | null>(null)
  const [savingConn, setSavingConn] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [envs, conns] = await Promise.all([environmentsApi.getAll(), connectionsApi.getSaved()])
      setEnvList(envs)
      setAllConns(conns)
      // If saved environment no longer exists, clear it
      setSelectedEnv(prev => {
        if (prev && !envs.includes(prev)) {
          localStorage.removeItem('lastEnvironment')
          return null
        }
        return prev
      })
    } catch (e) {
      console.error('Failed to load data', e)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const visibleConns = selectedEnv ? allConns.filter(c => c.environment === selectedEnv) : []

  const resetForm = () => {
    setMode('new')
    setEditingOriginalName('')
    setUri('mongodb://localhost:27017')
    setConnName('')
    setError(null)
  }

  const handleCreateEnvironment = async (name: string) => {
    try {
      await environmentsApi.save(name)
      await loadData()
      selectEnv(name)
      setEnvModalOpen(false)
    } catch (e: any) {
      setError(String(e))
    }
  }

  const handleStartEdit = (conn: SavedConnection, e: React.MouseEvent) => {
    e.stopPropagation()
    setMode('edit')
    setEditingOriginalName(conn.name)
    setConnName(conn.name)
    setUri(conn.uri)
    setError(null)
    setDeleteConfirm(null)
  }

  const handleConnect = async (connectUri?: string, name?: string) => {
    const targetUri = connectUri ?? uri
    if (!targetUri.trim()) { setError('Please enter a connection URI'); return }
    setConnecting(true)
    setConnectingName(name ?? null)
    setError(null)
    try {
      await dbApi.connect(targetUri)
      const dbs = await dbApi.listDatabases()
      setDatabases(dbs)
      setConnected(true, targetUri)
    } catch (e: any) {
      setError(String(e))
    } finally {
      setConnecting(false)
      setConnectingName(null)
    }
  }

  const handleSave = async () => {
    if (!connName.trim()) { setError('Please enter a name'); return }
    if (!uri.trim()) { setError('Please enter a URI'); return }
    if (!selectedEnv) { setError('Please select an environment first'); return }
    setSavingConn(true)
    setError(null)
    try {
      if (mode === 'edit' && editingOriginalName !== connName.trim()) {
        await connectionsApi.delete(editingOriginalName, selectedEnv)
      }
      await connectionsApi.save(connName.trim(), uri.trim(), selectedEnv)
      await loadData()
      resetForm()
    } catch (e: any) {
      setError(String(e))
    } finally {
      setSavingConn(false)
    }
  }

  const handleDelete = async (name: string) => {
    if (!selectedEnv) return
    try {
      await connectionsApi.delete(name, selectedEnv)
      await loadData()
      if (mode === 'edit' && editingOriginalName === name) resetForm()
      setDeleteConfirm(null)
    } catch (e: any) {
      setError(String(e))
    }
  }

  const isEditing = mode === 'edit'

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 shrink-0 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 p-1.5 rounded-lg">
              <Database className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm">MongoDB Admin</span>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            title="Settings"
            className="text-gray-500 hover:text-gray-200 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Environment selector */}
        <div className="px-3 pt-3 pb-2 border-b border-gray-700">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
            Environment
          </p>
          <div className="flex gap-1">
            <div className="relative flex-1">
              <Layers className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
              <select
                value={selectedEnv ?? ''}
                onChange={e => { selectEnv(e.target.value || null); resetForm() }}
                className="w-full bg-gray-900 text-gray-200 border border-gray-600 rounded-lg pl-7 pr-6 py-1.5 text-xs appearance-none focus:outline-none focus:border-gray-400 cursor-pointer"
              >
                <option value="">Select environment…</option>
                {envList.map(env => (
                  <option key={env} value={env}>{env}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setEnvModalOpen(true)}
              title="New environment"
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Connections list */}
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-2">
            Saved Connections
          </p>

          {!selectedEnv ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <Layers className="w-7 h-7 text-gray-700 mb-2" />
              <p className="text-xs text-gray-500">Select or create an environment to see connections.</p>
            </div>
          ) : visibleConns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <ServerCrash className="w-7 h-7 text-gray-700 mb-2" />
              <p className="text-xs text-gray-500">No connections in <span className="text-gray-400 font-medium">{selectedEnv}</span>.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {visibleConns.map(conn => {
                const isLoading = connecting && connectingName === conn.name
                const isActive = isEditing && editingOriginalName === conn.name
                const isConfirming = deleteConfirm === conn.name
                return (
                  <div
                    key={conn.name}
                    onClick={() => !isConfirming && handleConnect(conn.uri, conn.name)}
                    className={`group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors cursor-pointer ${
                      isActive ? 'bg-blue-900/40 border border-blue-600/50' : 'hover:bg-gray-700 border border-transparent'
                    }`}
                  >
                    {isLoading
                      ? <Loader2 className="w-4 h-4 text-green-500 shrink-0 animate-spin" />
                      : <Database className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-green-500'}`} />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{conn.name}</p>
                      <p className="text-xs text-gray-500 truncate">{conn.uri}</p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      {isConfirming ? (
                        <>
                          <button onClick={e => { e.stopPropagation(); handleDelete(conn.name) }} className="text-red-400 hover:text-red-300 p-1 rounded" title="Confirm">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setDeleteConfirm(null) }} className="text-gray-500 hover:text-gray-300 p-1 rounded">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={e => handleStartEdit(conn, e)} className="text-gray-500 hover:text-blue-400 p-1 rounded" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setDeleteConfirm(conn.name) }} className="text-gray-500 hover:text-red-400 p-1 rounded" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Main form */}
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-10">
        <div className="w-full max-w-[60vw]">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold text-white">
              {isEditing ? 'Edit Connection' : 'New Connection'}
            </h2>
            {isEditing && (
              <button onClick={resetForm} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            )}
          </div>
          <p className="text-sm text-gray-400 mb-6">
            {isEditing ? `Editing "${editingOriginalName}"` : 'Enter a MongoDB URI to connect.'}
          </p>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-4">
            {/* Environment badge */}
            {selectedEnv && (
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-400">Environment: <span className="text-gray-200 font-medium">{selectedEnv}</span></span>
              </div>
            )}

            {/* URI / Advanced toggle */}
            <div className="flex bg-gray-900 rounded-lg border border-gray-700 p-0.5">
              <button
                type="button"
                onClick={() => setInputMode('uri')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  inputMode === 'uri' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Link className="w-3.5 h-3.5" />
                Connection String
              </button>
              <button
                type="button"
                onClick={() => setInputMode('advanced')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  inputMode === 'advanced' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Advanced
              </button>
            </div>

            {inputMode === 'uri' ? (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Connection URI</label>
                <input
                  type="text"
                  value={uri}
                  onChange={e => setUri(e.target.value)}
                  placeholder="mongodb://localhost:27017"
                  className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 transition-colors font-mono"
                  onKeyDown={e => e.key === 'Enter' && handleConnect()}
                />
                {detectUriWarnings(uri).map((w, i) => (
                  <div key={i} className="flex items-start gap-2 mt-2 bg-yellow-900/30 border border-yellow-700/50 text-yellow-300 rounded-lg px-3 py-2 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <AdvancedConnectionForm uri={uri} onChange={setUri} />
                {/* Generated URI preview */}
                <div className="mt-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Generated URI</span>
                  <p className="text-xs font-mono text-gray-400 break-all mt-0.5">{uri}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {isEditing ? 'Name' : 'Save as (optional)'}
                </label>
                <input
                  type="text"
                  value={connName}
                  onChange={e => setConnName(e.target.value)}
                  placeholder="My Connection"
                  className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 transition-colors"
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSave}
                  disabled={savingConn || !selectedEnv}
                  title={!selectedEnv ? 'Select an environment first' : undefined}
                  className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {savingConn ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditing ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {isEditing ? 'Update' : 'Save'}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm whitespace-pre-wrap">
                {error}
              </div>
            )}

            <button
              onClick={() => handleConnect()}
              disabled={connecting}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connecting && !connectingName ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Connecting...</>
              ) : (
                <><Plug className="w-5 h-5" /> Connect</>
              )}
            </button>
          </div>
        </div>
        </div>
      </main>

      {/* New environment modal */}
      {envModalOpen && (
        <NewEnvironmentModal
          onClose={() => setEnvModalOpen(false)}
          onSave={handleCreateEnvironment}
        />
      )}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
