/**
 * Entity matching: decide whether an extracted name refers to the target
 * restaurant, with a confidence and a human-readable reason.
 *
 * Pure + deterministic. Reuses the canonical name normalizer and adds alias and
 * domain signals. Deliberately avoids naive substring false positives ("Bar" ⊄
 * every bar) by matching on normalized tokens with length/containment guards.
 */

import { normalizeName, domainFromUrl } from '@/lib/engine/normalize'

export interface MatchTarget {
  id?: string | null
  name: string
  aliases?: string[]
  domain?: string | null
  /** social handles, e.g. "@dekas" — compared loosely against the candidate name */
  socials?: string[]
}

export interface MatchCandidate {
  name: string
  domain?: string | null
}

export interface MatchResult {
  matched: boolean
  matchedRestaurantId: string | null
  confidence: number
  reason: string | null
}

const TARGET_THRESHOLD = 0.7
const tokens = (s: string) => new Set(normalizeName(s).split(' ').filter((w) => w.length > 1))

/** Jaccard overlap of normalized token sets (0–1). */
function tokenOverlap(a: string, b: string): number {
  const ta = tokens(a), tb = tokens(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter++
  return inter / (ta.size + tb.size - inter)
}

/** One normalized name contains the other as a token-subset (guards tiny names). */
function tokenSubset(a: string, b: string): boolean {
  const ta = tokens(a), tb = tokens(b)
  if (ta.size === 0 || tb.size === 0) return false
  const [small, big] = ta.size <= tb.size ? [ta, tb] : [tb, ta]
  if (small.size === 0) return false
  for (const t of small) if (!big.has(t)) return false
  // Guard against a single very short token matching ("de", "la").
  return [...small].some((t) => t.length >= 4) || small.size >= 2
}

/**
 * Compare a candidate name (optionally with a domain) against the target.
 * Returns the best signal found.
 */
export function matchEntity(candidate: MatchCandidate, target: MatchTarget): MatchResult {
  const id = target.id ?? null
  const cn = normalizeName(candidate.name)
  if (!cn) return { matched: false, matchedRestaurantId: null, confidence: 0, reason: null }

  const names = [target.name, ...(target.aliases ?? [])].map(normalizeName).filter(Boolean)

  // 1. Exact normalized name / alias match.
  if (names.includes(cn)) {
    const isAlias = cn !== normalizeName(target.name)
    return { matched: true, matchedRestaurantId: id, confidence: isAlias ? 0.92 : 1, reason: isAlias ? 'alias match' : 'exact name match' }
  }

  // 2. Domain match (strong identity signal).
  const cd = domainFromUrl(candidate.domain)
  const td = domainFromUrl(target.domain)
  if (cd && td && cd === td) {
    return { matched: true, matchedRestaurantId: id, confidence: 0.95, reason: 'domain match' }
  }

  // 3. Social handle loosely present in the candidate name.
  for (const handle of target.socials ?? []) {
    const h = handle.replace(/^@/, '').toLowerCase()
    if (h.length >= 4 && normalizeName(candidate.name).replace(/\s/g, '').includes(h)) {
      return { matched: true, matchedRestaurantId: id, confidence: 0.85, reason: 'social handle match' }
    }
  }

  // 4. Token-subset containment (guarded against tiny partials).
  if (names.some((n) => tokenSubset(cn, n))) {
    return { matched: true, matchedRestaurantId: id, confidence: 0.85, reason: 'name contains target' }
  }

  // 5. Strong token overlap.
  const overlap = Math.max(...names.map((n) => tokenOverlap(cn, n)))
  if (overlap >= TARGET_THRESHOLD) {
    return { matched: true, matchedRestaurantId: id, confidence: Math.min(0.84, overlap), reason: 'strong word overlap' }
  }

  return { matched: false, matchedRestaurantId: null, confidence: Math.round(overlap * 100) / 100, reason: null }
}
