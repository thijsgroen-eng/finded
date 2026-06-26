import { NextRequest, NextResponse } from 'next/server'
import { loadObservations, computeBenchmark, computePatterns, patternEvidence, FACTS, ObsRow } from '@/lib/observations'
import { getSettings } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const norm = (s: string | null) => (s ?? '').trim().toLowerCase()

/**
 * GET /api/admin/insights?cuisine=&city=  (admin-gated)
 * Filterable, aggregate-only industry intelligence from the Observation Engine.
 * Returns the benchmark + patterns for the current filter, the filter options,
 * and per-segment tables. Never returns individual customer rows.
 */
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  const cuisine = sp.get('cuisine') || ''
  const city = sp.get('city') || ''

  const rows = await loadObservations()
  const lang = (await getSettings()).defaultLanguage

  // Filter options with counts.
  const tally = (pick: (r: ObsRow) => string | null) => {
    const m = new Map<string, number>()
    for (const r of rows) { const k = norm(pick(r)); if (k) m.set(k, (m.get(k) ?? 0) + 1) }
    return [...m.entries()].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n)
  }

  // Current-filter slice.
  const filtered = rows.filter((r) => (!cuisine || norm(r.cuisine) === norm(cuisine)) && (!city || norm(r.city) === norm(city)))
  const benchmark = computeBenchmark(rows, { cuisine, city })

  // Patterns: prefer the filtered slice when it's big enough, else fall back to all.
  const basis = filtered.length >= 12 ? filtered : rows
  const patternScope = filtered.length >= 12 && (cuisine || city) ? 'segment' : 'all'
  const patterns = computePatterns(basis).map((p) => ({ ...p, evidence: patternEvidence(p, lang) }))

  const MIN = 5
  const byCuisine = tally((r) => r.cuisine).map((c) => ({ key: c.key, ...computeBenchmark(rows, { cuisine: c.key }) })).filter((b) => b.n >= MIN)
  const byCity = tally((r) => r.city).map((c) => ({ key: c.key, ...computeBenchmark(rows, { city: c.key }) })).filter((b) => b.n >= MIN)

  return NextResponse.json({
    total: rows.length,
    filter: { cuisine, city },
    filterN: filtered.length,
    benchmark,
    patterns,
    patternScope,
    byCuisine,
    byCity,
    options: { cuisines: tally((r) => r.cuisine), cities: tally((r) => r.city) },
    facts: FACTS.map((f) => ({ key: f.key, label: lang === 'nl' ? f.nl : f.en })),
  })
}
