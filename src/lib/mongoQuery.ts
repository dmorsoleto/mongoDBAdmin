/**
 * Converts MongoDB shell syntax to valid JSON accepted by serde_json + bson.
 *
 * Handles:
 *   ObjectId('hex')        → {"$oid":"hex"}
 *   ISODate('...')         → {"$date":"..."}
 *   new Date('...')        → {"$date":"..."}
 *   NumberLong(n)          → {"$numberLong":"n"}
 *   NumberInt(n)           → n
 *   unquoted keys          → "quoted keys"
 *   single-quoted strings  → "double-quoted strings"
 */
export function mongoShellToJson(input: string): string {
  let s = input.trim()
  if (!s) return s

  // ObjectId('hex') or ObjectId("hex")
  s = s.replace(
    /\bObjectId\s*\(\s*['"]([a-fA-F0-9]{24})['"]\s*\)/g,
    '{"$oid":"$1"}'
  )

  // ISODate('...')
  s = s.replace(
    /\bISODate\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    '{"$date":"$1"}'
  )

  // new Date('...')
  s = s.replace(
    /\bnew\s+Date\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    '{"$date":"$1"}'
  )

  // NumberLong(n)
  s = s.replace(
    /\bNumberLong\s*\(\s*(-?\d+)\s*\)/g,
    '{"$numberLong":"$1"}'
  )

  // NumberInt(n) → bare number
  s = s.replace(/\bNumberInt\s*\(\s*(-?\d+)\s*\)/g, '$1')

  // Unquoted keys: handles plain keys and $operator keys
  // Matches after { or , followed by optional whitespace
  s = s.replace(/([{,]\s*)(\$?[a-zA-Z_][a-zA-Z0-9_.$]*)\s*:/g, '$1"$2":')

  // Single-quoted strings → double-quoted
  s = s.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, '"$1"')

  return s
}

/**
 * Parse and validate an aggregate pipeline string (array of stage objects).
 * Returns the JSON string to send to Rust, or throws with a user-friendly message.
 */
export function parsePipeline(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error('Pipeline is empty')
  const converted = mongoShellToJson(trimmed)
  let parsed: unknown
  try {
    parsed = JSON.parse(converted)
  } catch {
    throw new Error(`Invalid pipeline syntax — make sure it is a valid JSON array`)
  }
  if (!Array.isArray(parsed)) throw new Error('Pipeline must be an array: [ { $stage: … }, … ]')
  return converted
}

/**
 * Parse and validate a MongoDB shell query string.
 * Returns the JSON string to send to Rust, or throws with a user-friendly message.
 */
export function parseQueryField(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '{}') return null

  const converted = mongoShellToJson(trimmed)

  try {
    JSON.parse(converted)
  } catch {
    throw new Error(`Invalid query syntax: ${trimmed}`)
  }

  return converted
}
