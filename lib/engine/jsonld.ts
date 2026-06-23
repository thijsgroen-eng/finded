/**
 * JSON-LD hygiene for generated schema assets.
 *
 * Models tend to emit JSON-LD with // or /* *​/ comments and trailing commas
 * (often because we used to ask for "TODO comments"). That is INVALID JSON-LD —
 * Google's parser and AI crawlers reject it. This module strips those, validates
 * with JSON.parse, and re-serializes cleanly inside the <script> block so what we
 * hand the customer is valid. Placeholders for owner-supplied facts stay as string
 * values (e.g. "[PLACEHOLDER: phone]"), which are valid JSON.
 *
 * Pure + dependency-free so it is unit-testable.
 */

const SCRIPT_RE = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi

/** Remove // line comments, /* *​/ block comments, and trailing commas from JSON. */
export function stripJsonComments(input: string): string {
  let out = ''
  let inString = false
  let quote = ''
  for (let i = 0; i < input.length; i++) {
    const c = input[i]
    const next = input[i + 1]
    if (inString) {
      out += c
      if (c === '\\') { out += next ?? ''; i++; continue }
      if (c === quote) inString = false
      continue
    }
    if (c === '"' || c === "'") { inString = true; quote = c; out += c; continue }
    if (c === '/' && next === '/') { while (i < input.length && input[i] !== '\n') i++; continue }
    if (c === '/' && next === '*') { i += 2; while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) i++; i++; continue }
    out += c
  }
  // Remove trailing commas before } or ]
  return out.replace(/,(\s*[}\]])/g, '$1')
}

/** Parse a JSON-LD string, tolerating comments/trailing commas. Returns null if invalid. */
export function parseJsonLd(raw: string): unknown | null {
  try { return JSON.parse(raw) } catch { /* try sanitized */ }
  try { return JSON.parse(stripJsonComments(raw)) } catch { return null }
}

export interface JsonLdBlock { raw: string; valid: boolean }

/** Extract every JSON-LD <script> block from an HTML/string asset. */
export function extractJsonLdBlocks(content: string): JsonLdBlock[] {
  const blocks: JsonLdBlock[] = []
  for (const m of content.matchAll(SCRIPT_RE)) {
    const raw = m[1].trim()
    blocks.push({ raw, valid: parseJsonLd(raw) !== null })
  }
  return blocks
}

/**
 * Rewrite each JSON-LD block to valid, pretty-printed JSON where possible
 * (comments/trailing commas removed). Blocks that still can't parse are left
 * untouched (we don't silently drop content). Bare JSON (no <script> wrapper) is
 * sanitized and wrapped.
 */
export function sanitizeJsonLd(content: string): string {
  const trimmed = content.trim()

  // Bare JSON document (no HTML/script wrapper).
  if (!SCRIPT_RE.test(content) && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
    const parsed = parseJsonLd(trimmed)
    if (parsed !== null) {
      return `<script type="application/ld+json">\n${JSON.stringify(parsed, null, 2)}\n</script>`
    }
    return content
  }

  return content.replace(SCRIPT_RE, (whole, inner) => {
    const parsed = parseJsonLd(inner.trim())
    if (parsed === null) return whole
    return whole.replace(inner, `\n${JSON.stringify(parsed, null, 2)}\n`)
  })
}

/** True if the asset has at least one JSON-LD block and all blocks are valid. */
export function hasValidJsonLd(content: string): boolean {
  const blocks = extractJsonLdBlocks(content)
  return blocks.length > 0 && blocks.every((b) => b.valid)
}
