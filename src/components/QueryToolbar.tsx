import { useState, KeyboardEvent, forwardRef, useImperativeHandle } from 'react'
import { Search, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import type { FindQuery } from '../lib/tauri'
import { parseQueryField } from '../lib/mongoQuery'
import { useStore } from '../store'

const DEFAULT_SORT_MAP: Record<string, string> = {
  default:      '',
  _id_asc:      '{ _id: 1 }',
  _id_desc:     '{ _id: -1 }',
  natural_desc: '{ $natural: -1 }',
}

export interface QueryToolbarHandle {
  setFilter: (value: string) => void
}

interface Props {
  onFind: (query: FindQuery) => void
  loading: boolean
}

const PLACEHOLDER: Record<string, string> = {
  filter: '{ field: "value" }',
  projection: '{ field: 1 }',
  sort: '{ field: 1 }',
  collation: '{ locale: "en" }',
  hint: 'index_name or { field: 1 }',
}

function QueryInput({
  label,
  value,
  onChange,
  placeholder,
  onEnter,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  onEnter: () => void
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && onEnter()}
        className="w-full bg-gray-900 text-gray-200 border border-gray-600 rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400/30 placeholder:text-gray-600 transition-colors"
        spellCheck={false}
      />
    </div>
  )
}

function NumberInput({
  label,
  value,
  onChange,
  placeholder,
  onEnter,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  onEnter: () => void
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && onEnter()}
        className="w-full bg-gray-900 text-gray-200 border border-gray-600 rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/40 placeholder:text-gray-600 transition-colors"
      />
    </div>
  )
}

export const QueryToolbar = forwardRef<QueryToolbarHandle, Props>(function QueryToolbar({ onFind, loading }, ref) {
  const { defaultSort, maxTimeMsLimit } = useStore()
  useImperativeHandle(ref, () => ({ setFilter: (value) => setFilter(value) }))
  const [filter, setFilter] = useState('')
  const [projection, setProjection] = useState('')
  const [sort, setSort] = useState(() => DEFAULT_SORT_MAP[defaultSort] ?? '')
  const [collation, setCollation] = useState('')
  const [hint, setHint] = useState('')
  const [limit, setLimit] = useState('')
  const [skip, setSkip] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  const buildQuery = (): FindQuery | null => {
    try {
      const query: FindQuery = {
        filter: parseQueryField(filter),
        projection: parseQueryField(projection),
        sort: parseQueryField(sort),
        collation: parseQueryField(collation),
        hint: hint.trim() || null,
        limit: limit !== '' ? parseInt(limit, 10) : null,
        skip: skip !== '' ? parseInt(skip, 10) : null,
        maxTimeMs: maxTimeMsLimit ?? null,
      }
      setParseError(null)
      return query
    } catch (e: any) {
      setParseError(String(e.message ?? e))
      return null
    }
  }

  const handleFind = () => {
    const query = buildQuery()
    if (query) onFind(query)
  }

  const handleReset = () => {
    setFilter('')
    setProjection('')
    setSort(DEFAULT_SORT_MAP[defaultSort] ?? '')
    setCollation('')
    setHint('')
    setLimit('')
    setSkip('')
    onFind({ maxTimeMs: maxTimeMsLimit ?? null })
  }

  const hasAdvanced = projection || sort || collation || hint || limit || skip

  return (
    <div className="bg-gray-850 border-b border-gray-700 px-4 py-3 shrink-0" style={{ backgroundColor: '#1a1f2e' }}>
      {/* Row 1: Filter + controls */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <QueryInput
            label="Filter"
            value={filter}
            onChange={setFilter}
            placeholder={PLACEHOLDER.filter}
            onEnter={handleFind}
          />
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded border transition-colors shrink-0 ${
            hasAdvanced
              ? 'border-green-600 text-green-400 bg-green-600/10'
              : 'border-gray-600 text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700'
          }`}
          title="More options"
        >
          Options
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        <button
          onClick={handleReset}
          title="Reset query"
          className="p-1.5 text-gray-500 hover:text-gray-300 rounded hover:bg-gray-700 transition-colors shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleFind}
          disabled={loading}
          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-1.5 rounded transition-colors shrink-0"
        >
          <Search className="w-3.5 h-3.5" />
          Find
        </button>
      </div>

      {/* Parse error */}
      {parseError && (
        <div className="mt-2 text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded px-3 py-1.5 font-mono">
          {parseError}
        </div>
      )}

      {/* Row 2: Advanced options */}
      {expanded && (
        <div className="grid grid-cols-6 gap-3 mt-3 pt-3 border-t border-gray-700/60">
          <div className="col-span-2">
            <QueryInput
              label="Project"
              value={projection}
              onChange={setProjection}
              placeholder={PLACEHOLDER.projection}
              onEnter={handleFind}
            />
          </div>
          <div className="col-span-2">
            <QueryInput
              label="Sort"
              value={sort}
              onChange={setSort}
              placeholder={PLACEHOLDER.sort}
              onEnter={handleFind}
            />
          </div>
          <QueryInput
            label="Collation"
            value={collation}
            onChange={setCollation}
            placeholder={PLACEHOLDER.collation}
            onEnter={handleFind}
          />
          <QueryInput
            label="Index Hint"
            value={hint}
            onChange={setHint}
            placeholder={PLACEHOLDER.hint}
            onEnter={handleFind}
          />
          <NumberInput
            label="Limit"
            value={limit}
            onChange={setLimit}
            placeholder="20"
            onEnter={handleFind}
          />
          <NumberInput
            label="Skip"
            value={skip}
            onChange={setSkip}
            placeholder="0"
            onEnter={handleFind}
          />
        </div>
      )}
    </div>
  )
})
