import { NextResponse } from 'next/server'
import { loadObservations, computeBenchmark, computePatterns, patternEvidence, FACTS } from '@/lib/observations'
import { getSettings } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/insights  (admin-gated)
 * Aggregate-only industry intelligence from the Observation Engine: overall +
 * per-segment benchmarks and evidence-backed patterns. Never returns individual
 * customer rows.
 */
export async function GET() {
  const rows = await loadObservations()
  const lang = (await getSettings()).defaultLanguage

  const overall = computeBenchmark(rows)
  const patterns = computePatterns(rows).map((p) => ({ ...p, evidence: patternEvidence(p, lang) }))

  // Segment benchmarks with a minimum sample size so nothing thin is shown.
  const norm = (s: string | null) => (s ?? '').trim().toLowerCase()
  const cuisines = [...new Set(rows.map((r) => norm(r.cuisine)).filter(Boolean))]
  const cities = [...new Set(rows.map((r) => norm(r.city)).filter(Boolean))]
  const MIN = 5
  const byCuisine = cuisines
    .map((c) => ({ key: c, ...computeBenchmark(rows, { cuisine: c }) }))
    .filter((b) => b.n >= MIN).sort((a, b) => b.n - a.n)
  const byCity = cities
    .map((c) => ({ key: c, ...computeBenchmark(rows, { city: c }) }))
    .filter((b) => b.n >= MIN).sort((a, b) => b.n - a.n)

  return NextResponse.json({
    total: rows.length,
    overall,
    patterns,
    byCuisine,
    byCity,
    facts: FACTS.map((f) => ({ key: f.key, label: lang === 'nl' ? f.nl : f.en })),
  })
}
