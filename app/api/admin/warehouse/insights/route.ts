import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/warehouse/insights  (admin-gated)
 * Reads the deterministic warehouse materialized views (V2). Tolerant: if the
 * views don't exist yet (030 not applied) or are empty, returns ready:false so
 * the UI can fall back to the legacy engine. The correlation gate (min sample +
 * meaningful lift) is applied here, deterministically — never invented.
 */
const MIN_N = 10
const MIN_LIFT = 1.1

export async function GET(_request: NextRequest) {
  const safe = async <T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T | null> => {
    try { const { data, error } = await p; return error ? null : data } catch { return null }
  }

  const [providers, benchmark, citations, signals, cooccurrence, competitors, recImpact, index] = await Promise.all([
    safe(supabaseAdmin.from('mv_provider_month').select('*').order('month', { ascending: true })),
    safe(supabaseAdmin.from('mv_benchmark').select('*')),
    safe(supabaseAdmin.from('mv_citation_influence').select('*').order('citations', { ascending: false }).limit(50)),
    safe(supabaseAdmin.from('mv_signal_correlation').select('*')),
    safe(supabaseAdmin.from('mv_competitor_cooccurrence').select('*').order('audits_together', { ascending: false }).limit(20)),
    safe(supabaseAdmin.from('mv_competitor_frequency').select('*').order('audits', { ascending: false }).limit(20)),
    safe(supabaseAdmin.from('mv_recommendation_impact').select('*').order('recommended', { ascending: false })),
    safe(supabaseAdmin.from('research_ai_visibility_index').select('*').order('month', { ascending: true })),
  ])

  if (providers == null && benchmark == null && citations == null && signals == null) {
    return NextResponse.json({ ready: false, reason: 'Warehouse views not available — apply migrations 030–032 and refresh.' })
  }

  // Correlation engine: only emit statistically meaningful, well-sampled signals.
  const correlations = (signals ?? []).map((s: any) => {
    const mentWith = Number(s.ment_with ?? 0), mentWithout = Number(s.ment_without ?? 0)
    const lift = mentWithout > 0 ? mentWith / mentWithout : null
    const visDelta = s.vis_with != null && s.vis_without != null ? Number(s.vis_with) - Number(s.vis_without) : null
    const significant = Number(s.n_with) >= MIN_N && Number(s.n_without) >= MIN_N && lift != null && Math.abs(lift - 1) >= (MIN_LIFT - 1)
    return {
      signal: s.signal, n_with: Number(s.n_with), n_without: Number(s.n_without),
      mention_lift: lift, visibility_delta: visDelta,
      direction: lift == null ? 'n/a' : lift >= 1 ? 'positive' : 'negative', significant,
    }
  }).sort((a, b) => (b.mention_lift ?? 0) - (a.mention_lift ?? 0))

  return NextResponse.json({
    ready: true,
    providers: providers ?? [],
    benchmark: benchmark ?? [],
    citations: citations ?? [],
    correlations,
    correlationsPublishable: correlations.filter((c) => c.significant),
    cooccurrence: cooccurrence ?? [],
    competitors: competitors ?? [],
    recommendationImpact: recImpact ?? [],
    visibilityIndex: index ?? [],
  })
}
