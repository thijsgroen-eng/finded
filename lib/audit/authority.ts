/**
 * Reputation & authority signals from the sources AI actually cited.
 *
 * When models answer "where should I eat", they often ground on third-party
 * sites (Tripadvisor, TheFork, Google, Michelin, tourism guides, food blogs).
 * We already store those citation URLs on model_runs.sources. Aggregating and
 * classifying them shows which platforms AI leans on — and whether the
 * restaurant's own site is among them. Pure + testable; uses only real stored
 * data (no fabricated "competitor has X" claims).
 */

import { domainFromUrl } from '@/lib/engine/normalize'

export interface AuthorityPlatform { key: string; label: string; count: number }
export interface AuthoritySignals {
  totalSources: number
  platforms: AuthorityPlatform[]   // known platforms AI cited, by count desc
  otherDomains: { domain: string; count: number }[] // everything else (blogs/press), top first
  ownCited: boolean                // did AI cite the restaurant's own domain?
}

const PLATFORMS: { key: string; label: string; match: RegExp }[] = [
  { key: 'tripadvisor', label: 'Tripadvisor', match: /tripadvisor\./i },
  { key: 'thefork', label: 'TheFork', match: /thefork|lafourchette/i },
  { key: 'google', label: 'Google', match: /(^|\.)google\.|maps\.app|goo\.gl/i },
  { key: 'michelin', label: 'Michelin Guide', match: /michelin/i },
  { key: 'iens', label: 'Iens / Eet.nu', match: /iens\.|eet\.nu/i },
  { key: 'tourism', label: 'Tourism guides', match: /iamsterdam|holland\.com|visit|tourism|toerisme|lonelyplanet|timeout/i },
]

/** Pull a URL string out of whatever shape a source entry takes. */
function toUrl(s: unknown): string | null {
  if (typeof s === 'string') return s
  if (s && typeof s === 'object') {
    const o = s as Record<string, unknown>
    const v = o.url ?? o.uri ?? o.link
    if (typeof v === 'string') return v
  }
  return null
}

export function buildAuthoritySignals(sources: unknown[], ownDomain?: string | null): AuthoritySignals {
  const own = (ownDomain || '').toLowerCase().replace(/^www\./, '')
  const platformCounts = new Map<string, number>()
  const otherCounts = new Map<string, number>()
  let total = 0
  let ownCited = false

  for (const s of sources) {
    const url = toUrl(s)
    const domain = domainFromUrl(url)
    if (!domain) continue
    total++
    if (own && (domain === own || domain.endsWith(`.${own}`))) { ownCited = true; continue }

    const platform = PLATFORMS.find((p) => p.match.test(domain))
    if (platform) platformCounts.set(platform.key, (platformCounts.get(platform.key) ?? 0) + 1)
    else otherCounts.set(domain, (otherCounts.get(domain) ?? 0) + 1)
  }

  const platforms: AuthorityPlatform[] = PLATFORMS
    .filter((p) => platformCounts.has(p.key))
    .map((p) => ({ key: p.key, label: p.label, count: platformCounts.get(p.key)! }))
    .sort((a, b) => b.count - a.count)

  const otherDomains = [...otherCounts.entries()]
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return { totalSources: total, platforms, otherDomains, ownCited }
}
