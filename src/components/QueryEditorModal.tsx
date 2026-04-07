import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { crud as crudApi } from '../lib/tauri'
import { useStore } from '../store'
import { parsePipeline, parseQueryField } from '../lib/mongoQuery'
import { JsonView } from './JsonView'
import { X, Play, RotateCcw, Loader2, Terminal, ChevronDown } from 'lucide-react'

// ── IntelliSense catalogues ────────────────────────────────────────────────

const PIPELINE_STAGES: { label: string; desc: string }[] = [
  { label: '$match',       desc: 'Filter documents' },
  { label: '$group',       desc: 'Group and accumulate' },
  { label: '$sort',        desc: 'Sort documents' },
  { label: '$project',     desc: 'Reshape documents' },
  { label: '$limit',       desc: 'Limit results' },
  { label: '$skip',        desc: 'Skip documents' },
  { label: '$unwind',      desc: 'Deconstruct array field' },
  { label: '$lookup',      desc: 'Left outer join' },
  { label: '$addFields',   desc: 'Add / update fields' },
  { label: '$set',         desc: 'Add / update fields (alias)' },
  { label: '$unset',       desc: 'Remove fields' },
  { label: '$count',       desc: 'Count documents' },
  { label: '$facet',       desc: 'Multi-facet aggregation' },
  { label: '$bucket',      desc: 'Bucket categorization' },
  { label: '$bucketAuto',  desc: 'Automatic bucketing' },
  { label: '$sample',      desc: 'Random sample' },
  { label: '$out',         desc: 'Write to collection' },
  { label: '$merge',       desc: 'Merge into collection' },
  { label: '$replaceRoot', desc: 'Replace document root' },
  { label: '$replaceWith', desc: 'Replace root (alias)' },
  { label: '$sortByCount', desc: 'Sort by occurrence count' },
  { label: '$geoNear',     desc: 'Geospatial near (pipeline)' },
  { label: '$graphLookup', desc: 'Recursive graph lookup' },
  { label: '$redact',      desc: 'Field-level access control' },
]

const QUERY_OPERATORS: { label: string; desc: string }[] = [
  { label: '$eq',           desc: 'Equal to' },
  { label: '$ne',           desc: 'Not equal to' },
  { label: '$gt',           desc: 'Greater than' },
  { label: '$gte',          desc: 'Greater than or equal' },
  { label: '$lt',           desc: 'Less than' },
  { label: '$lte',          desc: 'Less than or equal' },
  { label: '$in',           desc: 'In array' },
  { label: '$nin',          desc: 'Not in array' },
  { label: '$and',          desc: 'Logical AND' },
  { label: '$or',           desc: 'Logical OR' },
  { label: '$not',          desc: 'Logical NOT' },
  { label: '$nor',          desc: 'Logical NOR' },
  { label: '$exists',       desc: 'Field exists' },
  { label: '$type',         desc: 'BSON type' },
  { label: '$regex',        desc: 'Regex match' },
  { label: '$options',      desc: 'Regex options' },
  { label: '$expr',         desc: 'Aggregation expression' },
  { label: '$elemMatch',    desc: 'Element match' },
  { label: '$size',         desc: 'Array size' },
  { label: '$all',          desc: 'Array contains all' },
  { label: '$mod',          desc: 'Modulo' },
  { label: '$text',         desc: 'Text search' },
  { label: '$where',        desc: 'JS expression' },
  { label: '$near',         desc: 'Geospatial near' },
  { label: '$geoWithin',    desc: 'Geospatial within' },
]

const EXPRESSION_OPERATORS: { label: string; desc: string }[] = [
  { label: '$sum',           desc: 'Sum values' },
  { label: '$avg',           desc: 'Average values' },
  { label: '$min',           desc: 'Minimum value' },
  { label: '$max',           desc: 'Maximum value' },
  { label: '$first',         desc: 'First value in group' },
  { label: '$last',          desc: 'Last value in group' },
  { label: '$push',          desc: 'Push to array' },
  { label: '$addToSet',      desc: 'Add unique to set' },
  { label: '$concat',        desc: 'Concatenate strings' },
  { label: '$concatArrays',  desc: 'Concatenate arrays' },
  { label: '$arrayElemAt',   desc: 'Element at index' },
  { label: '$filter',        desc: 'Filter array elements' },
  { label: '$map',           desc: 'Map over array' },
  { label: '$reduce',        desc: 'Reduce array' },
  { label: '$slice',         desc: 'Slice array' },
  { label: '$zip',           desc: 'Zip arrays' },
  { label: '$indexOfArray',  desc: 'Index in array' },
  { label: '$cond',          desc: 'Conditional (if/then/else)' },
  { label: '$ifNull',        desc: 'If null fallback' },
  { label: '$switch',        desc: 'Switch / case' },
  { label: '$toLower',       desc: 'To lowercase' },
  { label: '$toUpper',       desc: 'To uppercase' },
  { label: '$toString',      desc: 'To string' },
  { label: '$toInt',         desc: 'To integer' },
  { label: '$toLong',        desc: 'To long' },
  { label: '$toDouble',      desc: 'To double' },
  { label: '$toDecimal',     desc: 'To decimal' },
  { label: '$toDate',        desc: 'To date' },
  { label: '$toBool',        desc: 'To boolean' },
  { label: '$toObjectId',    desc: 'To ObjectId' },
  { label: '$dateToString',  desc: 'Date → formatted string' },
  { label: '$year',          desc: 'Year of date' },
  { label: '$month',         desc: 'Month of date' },
  { label: '$dayOfMonth',    desc: 'Day of month' },
  { label: '$hour',          desc: 'Hour of date' },
  { label: '$minute',        desc: 'Minute of date' },
  { label: '$second',        desc: 'Second of date' },
  { label: '$abs',           desc: 'Absolute value' },
  { label: '$add',           desc: 'Add numbers / dates' },
  { label: '$subtract',      desc: 'Subtract numbers' },
  { label: '$multiply',      desc: 'Multiply numbers' },
  { label: '$divide',        desc: 'Divide numbers' },
  { label: '$ceil',          desc: 'Ceiling' },
  { label: '$floor',         desc: 'Floor' },
  { label: '$round',         desc: 'Round' },
  { label: '$sqrt',          desc: 'Square root' },
  { label: '$pow',           desc: 'Power' },
  { label: '$trunc',         desc: 'Truncate decimal' },
]

const CONSTRUCTORS: { label: string; insert: string; desc: string; cursorOffset: number }[] = [
  { label: 'ObjectId',      insert: 'ObjectId("")',      desc: 'ObjectId value',   cursorOffset: 10 },
  { label: 'ISODate',       insert: 'ISODate("")',        desc: 'ISO date',         cursorOffset: 8  },
  { label: 'NumberLong',    insert: 'NumberLong()',       desc: '64-bit integer',   cursorOffset: 11 },
  { label: 'NumberInt',     insert: 'NumberInt()',        desc: '32-bit integer',   cursorOffset: 10 },
  { label: 'true',          insert: 'true',               desc: 'Boolean',          cursorOffset: 4  },
  { label: 'false',         insert: 'false',              desc: 'Boolean',          cursorOffset: 5  },
  { label: 'null',          insert: 'null',               desc: 'Null value',       cursorOffset: 4  },
]

// ── context helpers ────────────────────────────────────────────────────────

function getTokenAtCursor(value: string, cursor: number) {
  let start = cursor
  while (start > 0 && !/[\s{},:"[\]()]/.test(value[start - 1])) start--
  return { token: value.slice(start, cursor), start }
}

function isKeyPosition(value: string, tokenStart: number): boolean {
  let i = tokenStart - 1
  while (i >= 0 && /\s/.test(value[i])) i--
  if (i < 0) return true
  return value[i] === '{' || value[i] === ','
}

function isValuePosition(value: string, tokenStart: number): boolean {
  let i = tokenStart - 1
  while (i >= 0 && /\s/.test(value[i])) i--
  if (i < 0) return false
  return value[i] === ':'
}

// ── suggestion type ────────────────────────────────────────────────────────

interface Suggestion {
  label: string
  insert: string
  desc?: string
  type: 'stage' | 'operator' | 'expression' | 'constructor' | 'field'
  cursorOffset: number
}

function buildSuggestions(value: string, cursor: number, fieldNames: string[]): {
  suggestions: Suggestion[]
  tokenRange: { start: number; end: number } | null
} {
  const { token, start } = getTokenAtCursor(value, cursor)
  const end = cursor

  if (token.startsWith('$')) {
    const lower = token.toLowerCase()
    const suggestions: Suggestion[] = [
      ...PIPELINE_STAGES
        .filter(s => s.label.startsWith(lower))
        .map(s => ({ label: s.label, insert: s.label, desc: s.desc, type: 'stage' as const, cursorOffset: s.label.length })),
      ...QUERY_OPERATORS
        .filter(s => s.label.startsWith(lower))
        .map(s => ({ label: s.label, insert: s.label, desc: s.desc, type: 'operator' as const, cursorOffset: s.label.length })),
      ...EXPRESSION_OPERATORS
        .filter(s => s.label.startsWith(lower) && !PIPELINE_STAGES.find(p => p.label === s.label) && !QUERY_OPERATORS.find(q => q.label === s.label))
        .map(s => ({ label: s.label, insert: s.label, desc: s.desc, type: 'expression' as const, cursorOffset: s.label.length })),
    ]
    return { suggestions, tokenRange: suggestions.length > 0 ? { start, end } : null }
  }

  if (isValuePosition(value, start)) {
    const lower = token.toLowerCase()
    const suggestions: Suggestion[] = CONSTRUCTORS
      .filter(c => c.label.toLowerCase().startsWith(lower))
      .map(c => ({ label: c.label, insert: c.insert, desc: c.desc, type: 'constructor' as const, cursorOffset: c.cursorOffset }))
    return { suggestions, tokenRange: suggestions.length > 0 ? { start, end } : null }
  }

  if (token.length > 0 && isKeyPosition(value, start)) {
    const lower = token.toLowerCase()
    const suggestions: Suggestion[] = fieldNames
      .filter(f => f.toLowerCase().startsWith(lower) && f !== token)
      .slice(0, 12)
      .map(f => ({ label: f, insert: `"${f}"`, desc: undefined, type: 'field' as const, cursorOffset: f.length + 2 }))
    return { suggestions, tokenRange: suggestions.length > 0 ? { start, end } : null }
  }

  return { suggestions: [], tokenRange: null }
}

// ── MongoTextarea (textarea + IntelliSense) ────────────────────────────────

interface MongoTextareaProps {
  value: string
  onChange: (v: string) => void
  onRun: () => void
  placeholder: string
  fieldNames: string[]
  rows?: number
}

function MongoTextarea({ value, onChange, onRun, placeholder, fieldNames, rows = 10 }: MongoTextareaProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [tokenRange, setTokenRange] = useState<{ start: number; end: number } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const compute = (val: string, cursor: number) => {
    const { suggestions, tokenRange } = buildSuggestions(val, cursor, fieldNames)
    setSuggestions(suggestions)
    setSelectedIdx(0)
    setTokenRange(tokenRange)
  }

  const apply = (s: Suggestion) => {
    if (!tokenRange || !textareaRef.current) return
    const before = value.slice(0, tokenRange.start)
    const after = value.slice(tokenRange.end)
    const newVal = before + s.insert + after
    onChange(newVal)
    setSuggestions([])
    setTokenRange(null)
    const newCursor = tokenRange.start + s.cursorOffset
    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(newCursor, newCursor)
    }, 0)
  }

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    compute(e.target.value, e.target.selectionStart ?? e.target.value.length)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown')  { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1)); return }
      if (e.key === 'ArrowUp')    { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) { e.preventDefault(); apply(suggestions[selectedIdx]); return }
      if (e.key === 'Escape')     { setSuggestions([]); return }
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onRun() }
  }

  useEffect(() => {
    if (!suggestions.length) return
    const handler = (ev: MouseEvent) => {
      if (!listRef.current?.contains(ev.target as Node) && ev.target !== textareaRef.current)
        setSuggestions([])
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [suggestions.length])

  const typeColor = (t: Suggestion['type']) => ({
    stage:       'text-purple-400',
    operator:    'text-amber-300',
    expression:  'text-blue-400',
    constructor: 'text-cyan-300',
    field:       'text-green-400',
  }[t])

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-gray-950 text-gray-200 border border-gray-600 rounded-lg px-4 py-3 text-xs font-mono focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 placeholder:text-gray-700 resize-none leading-relaxed transition-colors"
        spellCheck={false}
        autoComplete="off"
      />
      {suggestions.length > 0 && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 bottom-full mb-1 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl z-50 overflow-hidden max-h-52 overflow-y-auto"
        >
          <div className="px-2 py-1 border-b border-gray-700 flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-gray-500" />
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">IntelliSense</span>
          </div>
          {suggestions.map((s, i) => (
            <div
              key={s.label}
              onMouseDown={(e) => { e.preventDefault(); apply(s) }}
              className={`flex items-center justify-between px-3 py-1.5 cursor-pointer text-xs font-mono transition-colors ${
                i === selectedIdx ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700/60'
              }`}
            >
              <span className={typeColor(s.type)}>{s.label}</span>
              {s.desc && <span className="text-gray-500 text-[10px] ml-3 shrink-0">{s.desc}</span>}
            </div>
          ))}
        </div>
      )}
      <div className="absolute bottom-2 right-2 text-[10px] text-gray-700 pointer-events-none">
        Ctrl+Enter to run · Tab to complete
      </div>
    </div>
  )
}

// ── main modal ─────────────────────────────────────────────────────────────

type Mode = 'aggregate' | 'find'

interface QueryEditorModalProps {
  onClose: () => void
}

const AGGREGATE_PLACEHOLDER = `[
  { $match: { } },
  { $sort: { _id: -1 } },
  { $limit: 20 }
]`

const FIND_PLACEHOLDER = `{ }`

export function QueryEditorModal({ onClose }: QueryEditorModalProps) {
  const { activeConnId, selectedDb, selectedCollection, documents } = useStore()

  const [mode, setMode] = useState<Mode>('aggregate')
  const [pipeline, setPipeline] = useState(AGGREGATE_PLACEHOLDER)
  const [findFilter, setFindFilter] = useState('{ }')
  const [findSort, setFindSort] = useState('')
  const [findProjection, setFindProjection] = useState('')

  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<any[] | null>(null)
  const [queryTime, setQueryTime] = useState<number | null>(null)
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set())

  const fieldNames = [...new Set(documents.flatMap(d => Object.keys(d)))].sort()

  const runQuery = useCallback(async () => {
    if (!activeConnId || !selectedDb || !selectedCollection) return
    setRunning(true)
    setError(null)
    setResults(null)
    setExpandedResults(new Set())
    const t0 = performance.now()
    try {
      let raw: string[]
      if (mode === 'aggregate') {
        const pipelineJson = parsePipeline(pipeline)
        raw = await crudApi.aggregate(activeConnId, selectedDb, selectedCollection, pipelineJson)
      } else {
        const filterJson = parseQueryField(findFilter) ?? '{}'
        const sortJson   = parseQueryField(findSort)
        const projJson   = parseQueryField(findProjection)
        const { findDocuments } = crudApi
        raw = await findDocuments(activeConnId, selectedDb, selectedCollection, {
          filter: filterJson,
          sort: sortJson,
          projection: projJson,
        }, 200, 0)
      }
      setResults(raw.map(r => JSON.parse(r)))
      setQueryTime(performance.now() - t0)
    } catch (e: any) {
      setError(String(e))
    } finally {
      setRunning(false)
    }
  }, [activeConnId, selectedDb, selectedCollection, mode, pipeline, findFilter, findSort, findProjection])

  const handleClear = () => {
    setResults(null)
    setError(null)
    setQueryTime(null)
    setPipeline(AGGREGATE_PLACEHOLDER)
    setFindFilter(FIND_PLACEHOLDER)
    setFindSort('')
    setFindProjection('')
  }

  const toggleExpand = (i: number) => setExpandedResults(prev => {
    const s = new Set(prev)
    s.has(i) ? s.delete(i) : s.add(i)
    return s
  })

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-4xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <Terminal className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold text-white">Query Editor</span>
            {selectedDb && selectedCollection && (
              <span className="text-xs text-gray-500 font-mono">
                {selectedDb}.<span className="text-green-400">{selectedCollection}</span>
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Mode tabs + actions */}
          <div className="flex items-center justify-between">
            <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-0.5 gap-0.5">
              {(['aggregate', 'find'] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                    mode === m ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </button>
              <button
                onClick={runQuery}
                disabled={running || !activeConnId}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 px-4 py-1.5 rounded-lg transition-colors"
              >
                {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Run
              </button>
            </div>
          </div>

          {/* Editor */}
          {mode === 'aggregate' ? (
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Pipeline</div>
              <MongoTextarea
                value={pipeline}
                onChange={setPipeline}
                onRun={runQuery}
                placeholder={AGGREGATE_PLACEHOLDER}
                fieldNames={fieldNames}
                rows={10}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Filter</div>
                <MongoTextarea value={findFilter} onChange={setFindFilter} onRun={runQuery}
                  placeholder='{ field: "value" }' fieldNames={fieldNames} rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Sort</div>
                  <MongoTextarea value={findSort} onChange={setFindSort} onRun={runQuery}
                    placeholder='{ field: 1 }' fieldNames={fieldNames} rows={3} />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Projection</div>
                  <MongoTextarea value={findProjection} onChange={setFindProjection} onRun={runQuery}
                    placeholder='{ field: 1 }' fieldNames={fieldNames} rows={3} />
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-900/30 border border-red-700/60 text-red-300 rounded-lg px-4 py-3 text-xs font-mono whitespace-pre-wrap">
              {error}
            </div>
          )}

          {/* Results */}
          {results !== null && (
            <div>
              <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-700/60">
                <span className="text-xs font-semibold text-gray-300">
                  {results.length === 0 ? 'No results' : `${results.length} document${results.length !== 1 ? 's' : ''}`}
                </span>
                {queryTime !== null && (
                  <span className="text-xs text-gray-600">
                    {queryTime < 1000 ? `${Math.round(queryTime)}ms` : `${(queryTime / 1000).toFixed(2)}s`}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {results.map((doc, i) => {
                  const expanded = expandedResults.has(i)
                  return (
                    <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleExpand(i)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-750 transition-colors"
                        style={{ backgroundColor: expanded ? 'rgba(255,255,255,0.03)' : undefined }}
                      >
                        <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform shrink-0 ${expanded ? '' : '-rotate-90'}`} />
                        <span className="text-xs text-gray-500 font-mono">
                          [{i}]
                        </span>
                        {!expanded && (
                          <span className="text-xs text-gray-400 font-mono truncate">
                            {JSON.stringify(doc).slice(0, 80)}
                          </span>
                        )}
                      </button>
                      {expanded && <JsonView doc={doc} />}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
