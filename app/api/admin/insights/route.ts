import { NextRequest, NextResponse } from 'next/server'
import {
  loadObservations, computeBenchmark, computePatterns, patternEvidence,
  scoreBuckets, perModelMentionRates, FACTS, ObsRow,
} from '@/lib/observations'
import { getSettings } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const norm = (s: string | null) => (s ?? '').trim().toLowerCase()

/**
 * GET /api/admin/insights?cuisine=&city=&since=&mentioned=  (admin-gated)
 * Filterable, aggregate-only intelligence from the Observation Engine: benchmark,
 * score distribution, per-model mention rates, measured patterns, and per-segment
 * tables. Never returns individual customer rows.
 *   since: days (e.g. 30, 90) — 0/absent = all time
 *   mentioned: 'rec' (recommended) | 'not' (not recommended) | '' (all)
 */
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  const cuisine = sp.get('cuisine') || ''
  const city = sp.get('city') || ''
  const since = Number(sp.get('since') || '0')
  const mentioned = sp.get('mentioned') || ''

  const all = await loadObservations()
  const lang = (await getSettings()).defaultLanguage

  // Apply the time + mention scope used by every aggregation below.
  const cutoff = since > 0 ? Date.now() - since * 86_400_000 : 0
  const scoped = all.filter((r) => {
    if (cutoff && r.createdAt && new Date(r.createdAt).getTime() < cutoff) return false
    if (mentioned === 'rec' && !r.mentionedAny) return false
    if (mentioned === 'not' && r.mentionedAny) return false
    return true
  })

  const tally = (rows: ObsRow[], pick: (r: ObsRow) => string | null) => {
    const m = new Map<string, number>()
    for (const r of rows) { const k = norm(pick(r)); if (k) m.set(k, (m.get(k) ?? 0) + 1) }
    return [...m.entries()].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n)
  }

  // Current segment (cuisine/city) within the scope.
  const filtered = scoped.filter((r) => (!cuisine || norm(r.cuisine) === norm(cuisine)) && (!city || norm(r.city) === norm(city)))
  const benchmark = computeBenchmark(scoped, { cuisine, city })

  // Patterns: prefer the filtered slice when big enough, else the whole scope.
  const basis = filtered.length >= 12 ? filtered : scoped
  const patternScope = filtered.length >= 12 && (cuisine || city) ? 'segment' : 'all'
  const patterns = computePatterns(basis).map((p) => ({ ...p, evidence: patternEvidence(p, lang) }))

  const MIN = 5
  const byCuisine = tally(scoped, (r) => r.cuisine).map((c) => ({ key: c.key, ...computeBenchmark(scoped, { cuisine: c.key }) })).filter((b) => b.n >= MIN)
  const byCity = tally(scoped, (r) => r.city).map((c) => ({ key: c.key, ...computeBenchmark(scoped, { city: c.key }) })).filter((b) => b.n >= MIN)

  return NextResponse.json({
    total: all.length,
    filter: { cuisine, city, since, mentioned },
    filterN: filtered.length,
    scopedN: scoped.length,
    benchmark,
    distribution: scoreBuckets(filtered),
    perModel: perModelMentionRates(filtered),
    patterns,
    patternScope,
    byCuisine,
    byCity,
    options: { cuisines: tally(scoped, (r) => r.cuisine), cities: tally(scoped, (r) => r.city) },
    facts: FACTS.map((f) => ({ key: f.key, label: lang === 'nl' ? f.nl : f.en })),
  })
}
