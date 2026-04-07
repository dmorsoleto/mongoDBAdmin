import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react'

// ── catalogues ─────────────────────────────────────────────────────────────

const MONGO_OPERATORS: { label: string; desc: string }[] = [
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
  { label: '$elemMatch',    desc: 'Element match' },
  { label: '$size',         desc: 'Array size' },
  { label: '$all',          desc: 'Array contains all' },
  { label: '$expr',         desc: 'Aggregation expression' },
  { label: '$mod',          desc: 'Modulo' },
  { label: '$text',         desc: 'Text search' },
  { label: '$where',        desc: 'JS expression' },
  { label: '$near',         desc: 'Geospatial near' },
  { label: '$geoWithin',    desc: 'Geospatial within' },
  { label: '$geoIntersects',desc: 'Geospatial intersects' },
]

// label = displayed text, insert = text inserted, cursorOffset = where to place cursor inside insert
const MONGO_CONSTRUCTORS: { label: string; insert: string; desc: string; cursorOffset: number }[] = [
  { label: 'ObjectId',      insert: 'ObjectId("")',      desc: 'ObjectId value',   cursorOffset: 10 },
  { label: 'ISODate',       insert: 'ISODate("")',        desc: 'ISO date string',  cursorOffset: 8  },
  { label: 'Date',          insert: 'Date("")',           desc: 'Date string',      cursorOffset: 6  },
  { label: 'NumberLong',    insert: 'NumberLong()',       desc: '64-bit integer',   cursorOffset: 11 },
  { label: 'NumberInt',     insert: 'NumberInt()',        desc: '32-bit integer',   cursorOffset: 10 },
  { label: 'NumberDecimal', insert: 'NumberDecimal("")', desc: 'Decimal128',        cursorOffset: 15 },
  { label: 'true',          insert: 'true',               desc: 'Boolean true',     cursorOffset: 4  },
  { label: 'false',         insert: 'false',              desc: 'Boolean false',    cursorOffset: 5  },
  { label: 'null',          insert: 'null',               desc: 'Null value',       cursorOffset: 4  },
]

// ── context helpers ────────────────────────────────────────────────────────

function getTokenAtCursor(value: string, cursor: number): { token: string; start: number } {
  let start = cursor
  while (start > 0 && !/[\s{},:"[\]()]/.test(value[start - 1])) start--
  return { token: value.slice(start, cursor), start }
}

/** Nearest non-space char to the left of the token start is `{` or `,` */
function isKeyPosition(value: string, tokenStart: number): boolean {
  let i = tokenStart - 1
  while (i >= 0 && /\s/.test(value[i])) i--
  if (i < 0) return true
  return value[i] === '{' || value[i] === ','
}

/** Nearest non-space char to the left of the token start is `:` */
function isValuePosition(value: string, tokenStart: number): boolean {
  let i = tokenStart - 1
  while (i >= 0 && /\s/.test(value[i])) i--
  if (i < 0) return false
  return value[i] === ':'
}

// ── types ──────────────────────────────────────────────────────────────────

interface Suggestion {
  label: string
  insert: string
  desc?: string
  type: 'operator' | 'field' | 'constructor'
  cursorOffset: number  // position of cursor inside insert
}

export interface FilterInputProps {
  value: string
  onChange: (v: string) => void
  onEnter: () => void
  placeholder: string
  fieldNames: string[]
}

// ── component ──────────────────────────────────────────────────────────────

export function FilterInput({ value, onChange, onEnter, placeholder, fieldNames }: FilterInputProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [tokenRange, setTokenRange] = useState<{ start: number; end: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const computeSuggestions = (val: string, cursor: number) => {
    const { token, start } = getTokenAtCursor(val, cursor)

    // ── $ operators (any position) ─────────────────────────────────────────
    if (token.startsWith('$')) {
      const lower = token.toLowerCase()
      const filtered = MONGO_OPERATORS
        .filter(op => op.label.startsWith(lower))
        .map(op => ({ label: op.label, insert: op.label, desc: op.desc, type: 'operator' as const, cursorOffset: op.label.length }))
      setSuggestions(filtered)
      setSelectedIdx(0)
      setTokenRange(filtered.length > 0 ? { start, end: cursor } : null)
      return
    }

    // ── value position → constructors ──────────────────────────────────────
    if (isValuePosition(val, start)) {
      const lower = token.toLowerCase()
      const filtered = MONGO_CONSTRUCTORS
        .filter(c => c.label.toLowerCase().startsWith(lower))
        .map(c => ({ label: c.label, insert: c.insert, desc: c.desc, type: 'constructor' as const, cursorOffset: c.cursorOffset }))
      setSuggestions(filtered)
      setSelectedIdx(0)
      setTokenRange(filtered.length > 0 ? { start, end: cursor } : null)
      return
    }

    // ── key position → field names ─────────────────────────────────────────
    if (token.length > 0 && isKeyPosition(val, start)) {
      const lower = token.toLowerCase()
      const filtered = fieldNames
        .filter(f => f.toLowerCase().startsWith(lower) && f !== token)
        .slice(0, 12)
        .map(f => ({ label: f, insert: `"${f}"`, desc: undefined, type: 'field' as const, cursorOffset: f.length + 2 }))
      setSuggestions(filtered)
      setSelectedIdx(0)
      setTokenRange(filtered.length > 0 ? { start, end: cursor } : null)
      return
    }

    setSuggestions([])
    setTokenRange(null)
  }

  const applySuggestion = (suggestion: Suggestion) => {
    if (!tokenRange) return
    const before = value.slice(0, tokenRange.start)
    const after = value.slice(tokenRange.end)
    const newVal = before + suggestion.insert + after
    onChange(newVal)
    setSuggestions([])
    setTokenRange(null)
    const newCursor = tokenRange.start + suggestion.cursorOffset
    setTimeout(() => {
      inputRef.current?.setSelectionRange(newCursor, newCursor)
      inputRef.current?.focus()
    }, 0)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onChange(val)
    const cursor = e.target.selectionStart ?? val.length
    computeSuggestions(val, cursor)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx(i => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault()
        applySuggestion(suggestions[selectedIdx])
        return
      }
      if (e.key === 'Escape') {
        setSuggestions([])
        return
      }
    }
    if (e.key === 'Enter') onEnter()
  }

  useEffect(() => {
    if (!suggestions.length) return
    const handler = (e: MouseEvent) => {
      if (!listRef.current?.contains(e.target as Node) && e.target !== inputRef.current) {
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [suggestions.length])

  const typeColor = (type: Suggestion['type']) => {
    if (type === 'operator')    return 'text-amber-300'
    if (type === 'constructor') return 'text-cyan-300'
    return 'text-green-400'
  }

  return (
    <div className="flex flex-col gap-1 min-w-0 relative">
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Filter</span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-gray-900 text-gray-200 border border-gray-600 rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400/30 placeholder:text-gray-600 transition-colors"
        spellCheck={false}
        autoComplete="off"
      />
      {suggestions.length > 0 && (
        <div
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-0.5 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl z-50 overflow-hidden max-h-52 overflow-y-auto"
        >
          {suggestions.map((s, i) => (
            <div
              key={s.label}
              onMouseDown={(e) => { e.preventDefault(); applySuggestion(s) }}
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
    </div>
  )
}
