/**
 * Normalization helpers for data quality: canonical keys for deduping restaurant
 * / competitor names, tidy city names, and website domains. Pure, dependency-free,
 * unit-tested. Conservative on names — it strips category words and accents but
 * keeps articles, so distinct names don't collapse into each other.
 */

const CATEGORY_WORDS = new Set([
  'restaurant', 'cafe', 'café', 'bar', 'bistro', 'brasserie', 'ristorante',
  'eetcafe', 'eetcafé', 'lunchroom', 'trattoria', 'osteria', 'pizzeria', 'grandcafe',
])

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Canonical key for matching/deduping a business name.
 * "Restaurant De Kas", "De Kas", "De Kas Restaurant", "De Kás" → "de kas".
 */
export function normalizeName(name: string | null | undefined): string {
  if (!name) return ''
  let s = stripAccents(name.toLowerCase()).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  let words = s.split(' ').filter(Boolean)
  // strip leading/trailing category words (not articles, to avoid over-merging)
  while (words.length > 1 && CATEGORY_WORDS.has(words[0])) words = words.slice(1)
  while (words.length > 1 && CATEGORY_WORDS.has(words[words.length - 1])) words = words.slice(0, -1)
  s = words.join(' ')
  return s
}

/**
 * Space-insensitive identity key — the normalized name with internal spaces
 * removed. Bridges spacing / data-entry differences so "Dekas" and "De Kas"
 * (and "Restaurant De Kas") resolve to the same identity: "dekas". Use for
 * IS-IT-THE-SAME-PLACE comparisons; keep normalizeName for tokenization.
 */
export function identityKey(name: string | null | undefined): string {
  return normalizeName(name).replace(/\s+/g, '')
}

const CITY_ALIASES: Record<string, string> = {
  'den haag': 'Den Haag', "'s-gravenhage": 'Den Haag', 's gravenhage': 'Den Haag',
  "'s-hertogenbosch": "'s-Hertogenbosch", 'den bosch': "'s-Hertogenbosch",
  amsterdam: 'Amsterdam', rotterdam: 'Rotterdam', utrecht: 'Utrecht', eindhoven: 'Eindhoven',
}

/** Tidy a city name: trim, collapse spaces, title-case, with a few NL aliases. */
export function normalizeCity(city: string | null | undefined): string | null {
  if (!city) return null
  const cleaned = city.replace(/\s+/g, ' ').trim()
  if (!cleaned) return null
  const key = cleaned.toLowerCase()
  if (key in CITY_ALIASES) return CITY_ALIASES[key]
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Normalized website domain (no protocol, no www, lowercased). Null if unparseable. */
export function domainFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const withProto = /^https?:\/\//i.test(url) ? url : `https://${url}`
    return new URL(withProto).hostname.replace(/^www\./i, '').toLowerCase() || null
  } catch {
    return null
  }
}
