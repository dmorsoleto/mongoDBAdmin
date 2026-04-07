import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Filter } from 'lucide-react'

// ── helpers ────────────────────────────────────────────────────────────────

export function detectSpecialType(obj: Record<string, any>): { type: string; value: string } | null {
  const keys = Object.keys(obj)
  if (keys.length === 1) {
    if (keys[0] === '$oid') return { type: 'ObjectId', value: obj.$oid }
    if (keys[0] === '$date') return { type: 'Date', value: typeof obj.$date === 'object' ? obj.$date.$numberLong ?? JSON.stringify(obj.$date) : obj.$date }
    if (keys[0] === '$numberLong') return { type: 'NumberLong', value: obj.$numberLong }
    if (keys[0] === '$numberDecimal') return { type: 'Decimal128', value: obj.$numberDecimal }
    if (keys[0] === '$binary') return { type: 'Binary', value: obj.$binary?.base64 ?? '' }
  }
  return null
}

export function buildFilterString(key: string, value: any): string {
  if (value === null) return `{ "${key}": null }`
  if (typeof value === 'boolean' || typeof value === 'number') return `{ "${key}": ${value} }`
  if (typeof value === 'string') return `{ "${key}": "${value}" }`
  if (typeof value === 'object') {
    const special = detectSpecialType(value)
    if (special?.type === 'ObjectId') return `{ "${key}": ObjectId("${special.value}") }`
    if (special?.type === 'Date') return `{ "${key}": ISODate("${special.value}") }`
    return `{ "${key}": ${JSON.stringify(value)} }`
  }
  return `{ "${key}": ${JSON.stringify(value)} }`
}

// ── popup ──────────────────────────────────────────────────────────────────

interface PopupState {
  key: string
  filterStr: string
  top: number
  left: number
}

interface KeyWithPopupProps {
  keyName: string
  value: any
  onFilterByKey?: (filter: string) => void
  popup: PopupState | null
  setPopup: (p: PopupState | null) => void
}

function KeyWithPopup({ keyName, value, onFilterByKey, popup, setPopup }: KeyWithPopupProps) {
  const spanRef = useRef<HTMLSpanElement>(null)
  const isOpen = popup?.key === keyName && popup?.filterStr === buildFilterString(keyName, value)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onFilterByKey) return
    if (isOpen) {
      setPopup(null)
      return
    }
    const rect = spanRef.current?.getBoundingClientRect()
    if (rect) {
      setPopup({
        key: keyName,
        filterStr: buildFilterString(keyName, value),
        top: rect.bottom + 6,
        left: rect.left,
      })
    }
  }

  return (
    <span ref={spanRef} className="relative">
      <span
        onClick={handleClick}
        className={`font-semibold cursor-pointer rounded px-0.5 -mx-0.5 transition-colors ${
          onFilterByKey
            ? 'text-gray-200 hover:text-white hover:bg-gray-600'
            : 'text-gray-200'
        } ${isOpen ? 'text-white bg-gray-600' : ''}`}
      >
        &quot;{keyName}&quot;
      </span>
    </span>
  )
}

// ── recursive value renderer ───────────────────────────────────────────────

interface JsonValueProps {
  value: any
  indent: number
  onFilterByKey?: (filter: string) => void
  popup: PopupState | null
  setPopup: (p: PopupState | null) => void
}

const INDENT_PX = 16
const ARRAY_PAGE_SIZE = 100

function JsonValue({ value, indent, onFilterByKey, popup, setPopup }: JsonValueProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [visibleCount, setVisibleCount] = useState(ARRAY_PAGE_SIZE)
  const pl = indent * INDENT_PX

  if (value === null) return <span className="text-gray-500 italic">null</span>
  if (typeof value === 'boolean') return <span className="text-purple-400">{value ? 'true' : 'false'}</span>
  if (typeof value === 'number') return <span className="text-blue-300">{value}</span>
  if (typeof value === 'string') return <span className="text-gray-300">&quot;{value}&quot;</span>

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-500">[]</span>
    return (
      <span>
        <button
          onClick={(e) => { e.stopPropagation(); setCollapsed(c => !c) }}
          className="text-gray-500 hover:text-gray-300 transition-colors select-none mr-0.5"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '▶' : '▼'}
        </button>
        {collapsed ? (
          <span>
            <span className="text-gray-500">[</span>
            <span
              className="text-gray-500 italic cursor-pointer hover:text-gray-300 mx-0.5"
              onClick={(e) => { e.stopPropagation(); setCollapsed(false) }}
            >
              {value.length} {value.length === 1 ? 'item' : 'items'}
            </span>
            <span className="text-gray-500">]</span>
          </span>
        ) : (
          <span>
            <span className="text-gray-500">[</span>
            <div style={{ paddingLeft: INDENT_PX }}>
              {value.slice(0, visibleCount).map((item, i) => (
                <div key={i}>
                  <JsonValue value={item} indent={indent + 1} onFilterByKey={onFilterByKey} popup={popup} setPopup={setPopup} />
                  {i < value.length - 1 && <span className="text-gray-600">,</span>}
                </div>
              ))}
              {visibleCount < value.length && (
                <div className="mt-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setVisibleCount(c => c + ARRAY_PAGE_SIZE) }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors italic"
                  >
                    Load more ({value.length - visibleCount} remaining)…
                  </button>
                </div>
              )}
            </div>
            <div style={{ paddingLeft: pl }}><span className="text-gray-500">]</span></div>
          </span>
        )}
      </span>
    )
  }

  if (typeof value === 'object') {
    const special = detectSpecialType(value)
    if (special) {
      if (special.type === 'ObjectId') return (
        <span>
          <span className="text-gray-500">ObjectId(</span>
          <span className="text-amber-300">&quot;{special.value}&quot;</span>
          <span className="text-gray-500">)</span>
        </span>
      )
      if (special.type === 'Date') return (
        <span>
          <span className="text-gray-500">Date(</span>
          <span className="text-cyan-300">&quot;{special.value}&quot;</span>
          <span className="text-gray-500">)</span>
        </span>
      )
      return (
        <span>
          <span className="text-gray-500">{special.type}(</span>
          <span className="text-blue-300">{special.value}</span>
          <span className="text-gray-500">)</span>
        </span>
      )
    }

    const entries = Object.entries(value)
    if (entries.length === 0) return <span className="text-gray-500">{'{}'}</span>

    return (
      <span>
        <button
          onClick={(e) => { e.stopPropagation(); setCollapsed(c => !c) }}
          className="text-gray-500 hover:text-gray-300 transition-colors select-none mr-0.5"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '▶' : '▼'}
        </button>
        {collapsed ? (
          <span>
            <span className="text-gray-500">{'{'}</span>
            <span
              className="text-gray-500 italic cursor-pointer hover:text-gray-300 mx-0.5"
              onClick={(e) => { e.stopPropagation(); setCollapsed(false) }}
            >
              {entries.length} {entries.length === 1 ? 'key' : 'keys'}
            </span>
            <span className="text-gray-500">{'}'}</span>
          </span>
        ) : (
          <span>
            <span className="text-gray-500">{'{'}</span>
            <div style={{ paddingLeft: INDENT_PX }}>
              {entries.map(([k, v], i) => (
                <div key={k} className="leading-relaxed">
                  <KeyWithPopup keyName={k} value={v} onFilterByKey={onFilterByKey} popup={popup} setPopup={setPopup} />
                  <span className="text-gray-600">: </span>
                  <JsonValue value={v} indent={indent + 1} onFilterByKey={onFilterByKey} popup={popup} setPopup={setPopup} />
                  {i < entries.length - 1 && <span className="text-gray-600">,</span>}
                </div>
              ))}
            </div>
            <div style={{ paddingLeft: pl }}><span className="text-gray-500">{'}'}</span></div>
          </span>
        )}
      </span>
    )
  }

  return <span className="text-gray-400">{String(value)}</span>
}

// ── main export ────────────────────────────────────────────────────────────

interface JsonViewProps {
  doc: any
  compact?: boolean
  onFilterByKey?: (filter: string) => void
}

export function JsonView({ doc, compact, onFilterByKey }: JsonViewProps) {
  const [popup, setPopup] = useState<PopupState | null>(null)

  // Close popup on outside click
  useEffect(() => {
    if (!popup) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-filter-popup]')) setPopup(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [popup])

  const handleFilter = (filter: string) => {
    onFilterByKey?.(filter)
    setPopup(null)
  }

  if (compact) {
    const entries = Object.entries(doc).slice(0, 4)
    return (
      <div className="font-mono text-xs leading-relaxed px-4 py-3 text-gray-400 truncate">
        {'{ '}
        {entries.map(([k, v], i) => (
          <span key={k}>
            <span className="text-gray-200 font-semibold">&quot;{k}&quot;</span>
            <span className="text-gray-600">: </span>
            <span className="text-gray-400">
              {v === null ? 'null'
                : typeof v === 'object' ? (Array.isArray(v) ? '[…]' : '{…}')
                : typeof v === 'string' ? `"${v}"`
                : String(v)}
            </span>
            {i < entries.length - 1 && <span className="text-gray-600">, </span>}
          </span>
        ))}
        {Object.keys(doc).length > 4 && <span className="text-gray-600"> … </span>}
        {' }'}
      </div>
    )
  }

  return (
    <div className="font-mono text-xs leading-relaxed px-4 py-3">
      <JsonValue value={doc} indent={0} onFilterByKey={onFilterByKey} popup={popup} setPopup={setPopup} />

      {/* Portal popup */}
      {popup && createPortal(
        <div
          data-filter-popup
          style={{ position: 'fixed', top: popup.top, left: popup.left, zIndex: 9999 }}
          className="bg-gray-700 border border-gray-600 rounded-lg shadow-2xl overflow-hidden"
        >
          <button
            onClick={() => handleFilter(popup.filterStr)}
            className="flex items-center gap-2 px-3 py-2 text-xs text-gray-200 hover:bg-gray-600 w-full text-left transition-colors"
          >
            <Filter className="w-3 h-3 text-green-400 shrink-0" />
            <span>Filter by <span className="text-green-400 font-semibold">&quot;{popup.key}&quot;</span></span>
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}
