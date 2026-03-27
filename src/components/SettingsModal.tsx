import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useStore } from '../store'

// ── Shared ───────────────────────────────────────────────────────────────────

function Checkbox({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div>
      <label className="flex items-start gap-3 cursor-pointer group">
        <div
          onClick={() => onChange(!checked)}
          className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
            checked
              ? 'bg-green-600 border-green-600'
              : 'bg-gray-900 border-gray-600 group-hover:border-gray-400'
          }`}
        >
          {checked && (
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
              <path
                d="M1.5 5l2.5 2.5 4.5-4.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        <div onClick={() => onChange(!checked)} className="select-none">
          <p className="text-sm text-gray-200 group-hover:text-white transition-colors">{label}</p>
          {description && (
            <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{description}</p>
          )}
        </div>
      </label>
    </div>
  )
}

// ── Draft state type ──────────────────────────────────────────────────────────

type DefaultSort = 'default' | '_id_asc' | '_id_desc' | 'natural_desc'

interface GeneralDraft {
  readOnlyMode: boolean
  protectConnectionStringSecrets: boolean
  defaultSort: DefaultSort
  maxTimeMsLimit: string
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ['General', 'Theme'] as const
type Tab = (typeof TABS)[number]

const DEFAULT_SORT_OPTIONS: {
  value: DefaultSort
  label: string
  sort: string
  description: string
  warning?: string
}[] = [
  {
    value: 'default',
    label: 'MongoDB server default',
    sort: '',
    description: 'Return documents in natural order of documents.',
  },
  {
    value: '_id_asc',
    label: '_id: 1',
    sort: '{ _id: 1 }',
    description: 'Return documents in ascending order by id.',
  },
  {
    value: '_id_desc',
    label: '_id: -1',
    sort: '{ _id: -1 }',
    description: 'Return documents in descending order by id.',
  },
  {
    value: 'natural_desc',
    label: '$natural: -1',
    sort: '{ $natural: -1 }',
    description: 'Return documents in reverse natural order, but ignores existing indexes.',
    warning: 'Suitable if you use this app only with development clusters. Avoid this option if you connect to production clusters as well.',
  },
]

function GeneralTab({ draft, setDraft }: { draft: GeneralDraft; setDraft: (d: GeneralDraft) => void }) {
  const set = (patch: Partial<GeneralDraft>) => setDraft({ ...draft, ...patch })

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <Checkbox
          checked={draft.readOnlyMode}
          onChange={v => set({ readOnlyMode: v })}
          label="Set Read-Only Mode"
          description="Disables all write operations (insert, update, delete). Useful for safely browsing production databases."
        />
        <Checkbox
          checked={draft.protectConnectionStringSecrets}
          onChange={v => set({ protectConnectionStringSecrets: v })}
          label="Protect Connection String Secrets"
          description="Masks passwords and credentials in the connection string shown in the header."
        />
      </div>

      <div className="border-t border-gray-700 pt-5">
        <label className="text-xs font-medium text-gray-400 block mb-1.5">
          Upper Limit for <span className="font-mono">maxTimeMS</span> for Database Operations
        </label>
        <input
          type="number"
          min={0}
          value={draft.maxTimeMsLimit}
          onChange={e => set({ maxTimeMsLimit: e.target.value })}
          placeholder="No limit"
          className="w-full bg-gray-900 text-gray-200 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 transition-colors"
        />
        <p className="text-[11px] text-gray-500 leading-relaxed mt-1.5">
          Set a maximum time in milliseconds for database operations. Leave blank to use no limit.
        </p>
      </div>

      <div className="border-t border-gray-700 pt-5">
        <p className="text-xs font-medium text-gray-400 mb-3">Default Sort for Query Bar</p>
        <div className="space-y-2">
          {DEFAULT_SORT_OPTIONS.map(opt => (
            <label
              key={opt.value}
              onClick={() => set({ defaultSort: opt.value })}
              className={`flex items-start gap-3 cursor-pointer rounded-lg border px-3 py-2.5 transition-colors ${
                draft.defaultSort === opt.value
                  ? 'border-green-600/60 bg-green-950/30'
                  : 'border-gray-700 hover:border-gray-600 bg-gray-900/40'
              }`}
            >
              {/* Radio dot */}
              <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                draft.defaultSort === opt.value
                  ? 'border-green-500'
                  : 'border-gray-600'
              }`}>
                {draft.defaultSort === opt.value && (
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                )}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-mono font-semibold text-gray-200">{opt.label}</p>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{opt.description}</p>
                {opt.warning && (
                  <p className="text-[11px] text-yellow-600/80 leading-relaxed mt-1">
                    ⚠️ {opt.warning}
                  </p>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Theme tab ────────────────────────────────────────────────────────────────

const THEME_OPTIONS: { value: 'dark' | 'light'; label: string; description: string }[] = [
  {
    value: 'dark',
    label: 'Dark',
    description: 'Dark background with light text. Easy on the eyes in low-light environments.',
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Light background with dark text. Best for well-lit environments.',
  },
]

function ThemeTab({
  value,
  onChange,
}: {
  value: 'dark' | 'light'
  onChange: (v: 'dark' | 'light') => void
}) {
  return (
    <div className="space-y-3">
      {THEME_OPTIONS.map(opt => (
        <label
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex items-start gap-4 cursor-pointer rounded-lg border px-4 py-3 transition-colors ${
            value === opt.value
              ? 'border-green-600/60 bg-green-950/30'
              : 'border-gray-700 hover:border-gray-600 bg-gray-900/40'
          }`}
        >
          {/* Preview swatch */}
          <div
            className="w-12 h-12 rounded-lg shrink-0 border flex flex-col gap-1 p-1.5 overflow-hidden"
            style={opt.value === 'dark'
              ? { background: '#111827', borderColor: '#374151' }
              : { background: '#f3f4f6', borderColor: '#d1d5db' }}
          >
            <div className="w-full h-1.5 rounded-sm" style={{ background: opt.value === 'dark' ? '#1f2937' : '#ffffff' }} />
            <div className="w-full h-1.5 rounded-sm" style={{ background: opt.value === 'dark' ? '#374151' : '#e5e7eb' }} />
            <div className="w-3/4 h-1.5 rounded-sm" style={{ background: '#16a34a' }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {/* Radio dot */}
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                value === opt.value ? 'border-green-500' : 'border-gray-600'
              }`}>
                {value === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
              </div>
              <p className="text-sm font-medium text-gray-200">{opt.label}</p>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed mt-1">{opt.description}</p>
          </div>
        </label>
      ))}
    </div>
  )
}

// ── Modal ────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

export function SettingsModal({ onClose }: Props) {
  const {
    readOnlyMode, protectConnectionStringSecrets, defaultSort, maxTimeMsLimit, theme,
    setReadOnlyMode, setProtectConnectionStringSecrets, setDefaultSort, setMaxTimeMsLimit, setTheme,
  } = useStore()

  const [activeTab, setActiveTab] = useState<Tab>('General')
  const [draft, setDraft] = useState<GeneralDraft>({
    readOnlyMode,
    protectConnectionStringSecrets,
    defaultSort,
    maxTimeMsLimit: maxTimeMsLimit !== null ? String(maxTimeMsLimit) : '',
  })
  const [themeDraft, setThemeDraft] = useState<'dark' | 'light'>(theme)

  const handleSave = () => {
    setReadOnlyMode(draft.readOnlyMode)
    setProtectConnectionStringSecrets(draft.protectConnectionStringSecrets)
    setDefaultSort(draft.defaultSort)
    const ms = draft.maxTimeMsLimit.trim()
    setMaxTimeMsLimit(ms === '' ? null : Number(ms))
    setTheme(themeDraft)
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg bg-gray-800 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex bg-gray-900 border-b border-gray-700 px-1">
          {TABS.map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-green-500 text-white bg-gray-800'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === 'General' && <GeneralTab draft={draft} setDraft={setDraft} />}
          {activeTab === 'Theme' && <ThemeTab value={themeDraft} onChange={setThemeDraft} />}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-700 bg-gray-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
