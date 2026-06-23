/**
 * Decode HTML entities found in scraped <title>/<meta> content so reports never
 * show raw codes like "&#8211;" or "&amp;". Handles numeric (decimal + hex) and
 * the common named entities seen in restaurant site metadata. No deps.
 */

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’',
  ldquo: '“', rdquo: '”', eacute: 'é', egrave: 'è', euml: 'ë',
  agrave: 'à', auml: 'ä', ouml: 'ö', uuml: 'ü', ccedil: 'ç',
  euro: '€', copy: '©', reg: '®', trade: '™', deg: '°', middot: '·',
}

export function decodeHtmlEntities(input: string | null | undefined): string | null {
  if (input == null) return null
  let out = input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => safeFromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeFromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]+);/g, (m, name) => (name in NAMED ? NAMED[name] : m))
  // Collapse whitespace introduced by &nbsp; etc.
  out = out.replace(/\s+/g, ' ').trim()
  return out
}

function safeFromCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return ''
  try { return String.fromCodePoint(code) } catch { return '' }
}
