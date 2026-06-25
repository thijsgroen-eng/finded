/**
 * Resolve a competitor's website URL from the audit's citation sources — without
 * any external search API. When AI cites a competitor's own site (not just an
 * aggregator like Tripadvisor), we can match it by comparing the domain's main
 * label to the competitor's normalized name. Pure + testable. Returns null when
 * no confident match exists (so we never crawl the wrong site).
 */

import { normalizeName, domainFromUrl } from '@/lib/engine/normalize'

function sourceUrl(s: unknown): string | null {
  if (typeof s === 'string') return s
  if (s && typeof s === 'object') {
    const o = s as Record<string, unknown>
    const v = o.url ?? o.uri ?? o.link
    if (typeof v === 'string') return v
  }
  return null
}

// Aggregators/directories — never treat these as a competitor's "own" site.
const AGGREGATORS = /tripadvisor|thefork|lafourchette|google\.|maps\.|michelin|iens|eet\.nu|facebook|instagram|yelp|booking\.|opentable|resy|quandoo|tiktok|youtube|wikipedia/i

/** Best-effort match of a competitor name to one of the cited source domains. */
export function resolveCompetitorUrl(competitorName: string, sources: unknown[]): string | null {
  const key = normalizeName(competitorName).replace(/\s+/g, '')
  if (key.length < 5) return null

  for (const s of sources) {
    const url = sourceUrl(s)
    const domain = domainFromUrl(url)
    if (!domain || AGGREGATORS.test(domain)) continue
    const label = domain.split('.')[0].replace(/[^a-z0-9]/g, '')
    if (label.length < 5) continue
    if (label.includes(key) || key.includes(label)) return url!.startsWith('http') ? url! : `https://${url}`
  }
  return null
}
