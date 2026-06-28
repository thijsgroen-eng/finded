/**
 * Recommendation parsing (parser layer, PARSER_VERSION).
 *
 * Tolerant parse of the model's JSON array. The model can hit the token limit
 * mid-string ("Unterminated string in JSON"), so when a strict parse fails we
 * salvage every COMPLETE {…} object up to the truncation point by scanning for
 * balanced braces (string-aware). Returns [] if nothing usable.
 *
 * Pure + deterministic → unit-tested in tests/recommendations.test.ts.
 */
export function parseRecommendations(text: string): Record<string, unknown>[] {
  const clean = text.replace(/```json|```/g, '').trim()
  try {
    const v = JSON.parse(clean)
    if (Array.isArray(v)) return v
  } catch { /* fall through to salvage */ }

  const start = clean.indexOf('[')
  if (start === -1) return []
  const objs: Record<string, unknown>[] = []
  let depth = 0, inStr = false, esc = false, objStart = -1
  for (let i = start + 1; i < clean.length; i++) {
    const c = clean[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '{') { if (depth === 0) objStart = i; depth++ }
    else if (c === '}') {
      depth--
      if (depth === 0 && objStart >= 0) {
        try { objs.push(JSON.parse(clean.slice(objStart, i + 1))) } catch { /* skip partial */ }
        objStart = -1
      }
    }
  }
  return objs
}
