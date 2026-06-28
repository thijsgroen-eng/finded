import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { twoPropTest, slope, stddev } from '@/lib/warehouse/stats'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/warehouse/overview  (admin-gated)
 *
 * The single deterministic feed for the Insights intelligence hub. Everything
 * here is read from the append-only warehouse materialized views (V2) — never
 * operational tables, never an LLM. All derived numbers (deltas, slopes,
 * confidence) are computed with reproducible statistics (lib/warehouse/stats).
 *
 * Discoveries are synthesized from the same views and gated to statistically
 * meaningful, well-sampled findings. The UI renders what it gets; it does not
 * invent. Tolerant: if views are missing (migrations not applied) returns
 * ready:false so the page can prompt a backfill.
 */

// Significance / sampling gates (shared meaning across every discovery type).
const MIN_N = 10            // minimum sample on each side of a comparison
const MIN_LIFT = 1.1        // ≥10% relative change to be worth surfacing
const CONF_GATE = 0.9       // two-sided confidence floor for "discoveries"
const MIN_VERIFIED = 3      // verified follow-ups before reporting rec impact
const MIN_SEG_DELTA = 5     // visibility points vs overall to flag a segment

type Disc = {
  id: string
  category: 'correlation' | 'provider' | 'impact' | 'benchmark' | 'citation'
  headline: string
  detail: string
  metric: string
  confidence: number | null
  sampleSize: number
  direction: 'positive' | 'negative' | 'neutral'
}

const ML: Record<string, string> = { openai: 'ChatGPT', anthropic: 'Claude', gemini: 'Gemini', perplexity: 'Perplexity' }

export async function GET(_request: NextRequest) {
  const safe = async <T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T | null> => {
    try { const { data, error } = await p; return error ? null : data } catch { return null }
  }
  const count = async (table: string): Promise<number | null> => {
    try {
      const { count: c, error } = await supabaseAdmin.from(table).select('*', { count: 'exact', head: true })
      return error ? null : (c ?? 0)
    } catch { return null }
  }
  const latestTs = async (table: string): Promise<string | null> => {
    const d = await safe(supabaseAdmin.from(table).select('observed_at').order('observed_at', { ascending: false }).limit(1))
    return (d as any[])?.[0]?.observed_at ?? null
  }

  const [
    providers, benchmark, citations, citationMonth, signals,
    cooccurrence, competitors, recImpact, index, segmentReport,
    auditN, responseN, citationN, entityN, recN,
    auditFresh, responseFresh,
  ] = await Promise.all([
    safe(supabaseAdmin.from('mv_provider_month').select('*').order('month', { ascending: true })),
    safe(supabaseAdmin.from('mv_benchmark').select('*')),
    safe(supabaseAdmin.from('mv_citation_influence').select('*').order('citations', { ascending: false }).limit(60)),
    safe(supabaseAdmin.from('mv_citation_month').select('*').order('month', { ascending: true })),
    safe(supabaseAdmin.from('mv_signal_correlation').select('*')),
    safe(supabaseAdmin.from('mv_competitor_cooccurrence').select('*').order('audits_together', { ascending: false }).limit(20)),
    safe(supabaseAdmin.from('mv_competitor_frequency').select('*').order('audits', { ascending: false }).limit(20)),
    safe(supabaseAdmin.from('mv_recommendation_impact').select('*').order('recommended', { ascending: false })),
    safe(supabaseAdmin.from('research_ai_visibility_index').select('*').order('month', { ascending: true })),
    safe(supabaseAdmin.from('research_segment_report').select('*')),
    count('fact_audit'), count('fact_provider_response'), count('fact_citation'),
    count('fact_entity'), count('fact_recommendation'),
    latestTs('fact_audit'), latestTs('fact_provider_response'),
  ])

  if (providers == null && benchmark == null && signals == null) {
    return NextResponse.json({ ready: false, reason: 'Warehouse views not available — apply migrations 029–034 and backfill.' })
  }

  // ── Correlations: deterministic gate + reproducible confidence (z-test) ──────
  const correlations = ((signals as any[]) ?? []).map((s) => {
    const nWith = Number(s.n_with ?? 0), nWithout = Number(s.n_without ?? 0)
    const rWith = Number(s.ment_with ?? 0), rWithout = Number(s.ment_without ?? 0)
    const lift = rWithout > 0 ? rWith / rWithout : null
    const visDelta = s.vis_with != null && s.vis_without != null ? Number(s.vis_with) - Number(s.vis_without) : null
    const { confidence } = twoPropTest(Math.round(rWith * nWith), nWith, Math.round(rWithout * nWithout), nWithout)
    const significant = nWith >= MIN_N && nWithout >= MIN_N && lift != null && Math.abs(lift - 1) >= (MIN_LIFT - 1) && confidence >= CONF_GATE
    return {
      signal: s.signal, n_with: nWith, n_without: nWithout,
      mention_with: rWith, mention_without: rWithout,
      mention_lift: lift, visibility_delta: visDelta, confidence,
      direction: lift == null ? 'neutral' : lift >= 1 ? 'positive' : 'negative', significant,
    }
  }).sort((a, b) => (b.confidence) - (a.confidence))

  // ── Providers: per provider+version monthly series + drift (first vs last) ───
  type PRow = { provider: string; model: string; version: string; month: string; responses: number; mentions?: number; mention_rate: number; avg_position: number | null }
  const byProvider = new Map<string, PRow[]>()
  for (const p of ((providers as PRow[]) ?? [])) {
    const k = `${p.provider}|${p.version}`
    if (!byProvider.has(k)) byProvider.set(k, [])
    byProvider.get(k)!.push(p)
  }
  const providerSeries = [...byProvider.entries()].map(([k, rows]) => {
    rows.sort((a, b) => a.month.localeCompare(b.month))
    const [provider, version] = k.split('|')
    const rates = rows.map((r) => Number(r.mention_rate ?? 0))
    const first = rows[0], last = rows[rows.length - 1]
    const drift = last && first ? Number(last.mention_rate) - Number(first.mention_rate) : 0
    // Significance of drift: two-proportion z-test on first vs last month responses.
    const fm = Math.round(Number(first?.mention_rate ?? 0) * Number(first?.responses ?? 0))
    const lm = Math.round(Number(last?.mention_rate ?? 0) * Number(last?.responses ?? 0))
    const { confidence } = twoPropTest(lm, Number(last?.responses ?? 0), fm, Number(first?.responses ?? 0))
    return {
      provider, version, model: last?.model ?? '',
      latest_month: last?.month ?? null, latest_rate: last ? Number(last.mention_rate) : null,
      latest_position: last?.avg_position ?? null, responses_total: rows.reduce((a, r) => a + Number(r.responses ?? 0), 0),
      months: rows.length, drift, trend_slope: slope(rates), drift_confidence: confidence,
      series: rows.map((r) => ({ month: r.month, mention_rate: Number(r.mention_rate ?? 0), responses: Number(r.responses ?? 0) })),
    }
  }).sort((a, b) => a.provider.localeCompare(b.provider))

  // ── Benchmarks: overall + segments, deviation from overall ───────────────────
  const bRows = ((benchmark as any[]) ?? [])
  const overall = bRows.find((r) => r.segment_type === 'overall') ?? null
  const overallAvg = overall ? Number(overall.avg_vis) : null
  const segments = bRows.filter((r) => r.segment_type !== 'overall').map((r) => ({
    segment_type: r.segment_type, segment_key: r.segment_key, n: Number(r.n),
    avg_vis: r.avg_vis == null ? null : Number(r.avg_vis),
    median_vis: r.median_vis == null ? null : Number(r.median_vis),
    p90: r.p90 == null ? null : Number(r.p90), p25: r.p25 == null ? null : Number(r.p25),
    pct_mentioned: r.pct_mentioned == null ? null : Number(r.pct_mentioned),
    deviation: overallAvg != null && r.avg_vis != null ? Number(r.avg_vis) - overallAvg : null,
  })).sort((a, b) => (b.deviation ?? 0) - (a.deviation ?? 0))

  // ── Research: visibility index series + slope/stddev ─────────────────────────
  const idxRows = ((index as any[]) ?? []).map((r) => ({
    month: r.month, n: Number(r.n), avg_visibility: r.avg_visibility == null ? null : Number(r.avg_visibility),
    pct_mentioned: r.pct_mentioned == null ? null : Number(r.pct_mentioned),
  }))
  const idxVals = idxRows.map((r) => r.avg_visibility ?? 0)
  const research = {
    index: idxRows,
    index_slope: slope(idxVals), index_stddev: stddev(idxVals),
    segments: ((segmentReport as any[]) ?? []).map((r) => ({
      segment_type: r.segment_type, segment_key: r.segment_key, month: r.month, n: Number(r.n),
      avg_visibility: r.avg_visibility == null ? null : Number(r.avg_visibility),
      pct_mentioned: r.pct_mentioned == null ? null : Number(r.pct_mentioned),
    })),
  }

  // ── Citations: top sources + monthly trend per domain ────────────────────────
  const citeTop = ((citations as any[]) ?? [])
  const citeMonthRows = ((citationMonth as any[]) ?? [])
  const citeByDomain = new Map<string, { month: string; citations: number }[]>()
  for (const c of citeMonthRows) {
    if (!citeByDomain.has(c.domain)) citeByDomain.set(c.domain, [])
    citeByDomain.get(c.domain)!.push({ month: c.month, citations: Number(c.citations) })
  }
  const citationTrends = [...citeByDomain.entries()].map(([domain, rows]) => {
    const byMonth = new Map<string, number>()
    for (const r of rows) byMonth.set(r.month, (byMonth.get(r.month) ?? 0) + r.citations)
    const series = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, citations]) => ({ month, citations }))
    return { domain, total: series.reduce((a, s) => a + s.citations, 0), series }
  }).sort((a, b) => b.total - a.total).slice(0, 12)

  // ── Recommendation impact (verified only carries weight) ─────────────────────
  const recImpactRows = ((recImpact as any[]) ?? []).map((r) => ({
    type: r.type, recommended: Number(r.recommended), implemented: Number(r.implemented),
    verified_n: Number(r.verified_n), avg_visibility_change: r.avg_visibility_change == null ? null : Number(r.avg_visibility_change),
  }))

  // ── DISCOVERIES: synthesize the headline, statistically-gated findings ───────
  const discoveries: Disc[] = []

  for (const c of correlations.filter((x) => x.significant)) {
    const pct = Math.round((c.mention_lift! - 1) * 100)
    discoveries.push({
      id: `corr:${c.signal}`, category: 'correlation',
      headline: `${c.signal.replace(/_/g, ' ')} ${c.direction === 'positive' ? 'lifts' : 'lowers'} AI recommendations by ${Math.abs(pct)}%`,
      detail: `Restaurants with this signal are recommended ${c.mention_lift!.toFixed(2)}× as often${c.visibility_delta != null ? ` (${c.visibility_delta > 0 ? '+' : ''}${Math.round(c.visibility_delta)} visibility points)` : ''}.`,
      metric: `${c.mention_lift!.toFixed(2)}×`, confidence: c.confidence,
      sampleSize: c.n_with + c.n_without, direction: c.direction as Disc['direction'],
    })
  }

  for (const p of providerSeries) {
    if (p.months >= 2 && Math.abs(p.drift) >= 0.05 && p.drift_confidence >= CONF_GATE && p.responses_total >= MIN_N) {
      const pts = Math.round(Math.abs(p.drift) * 100)
      discoveries.push({
        id: `prov:${p.provider}:${p.version}`, category: 'provider',
        headline: `${ML[p.provider] ?? p.provider} now recommends restaurants ${p.drift > 0 ? 'more' : 'less'} often (${p.drift > 0 ? '+' : '−'}${pts}pts)`,
        detail: `Mention rate moved from ${Math.round((p.series[0].mention_rate) * 100)}% to ${Math.round((p.latest_rate ?? 0) * 100)}% across ${p.months} months on ${p.provider} ${p.version}.`,
        metric: `${p.drift > 0 ? '+' : '−'}${pts}pts`, confidence: p.drift_confidence,
        sampleSize: p.responses_total, direction: p.drift > 0 ? 'positive' : 'negative',
      })
    }
  }

  for (const r of recImpactRows) {
    if (r.verified_n >= MIN_VERIFIED && r.avg_visibility_change != null && Math.abs(r.avg_visibility_change) >= 1) {
      discoveries.push({
        id: `impact:${r.type}`, category: 'impact',
        headline: `Implementing "${r.type}" changed visibility by ${r.avg_visibility_change > 0 ? '+' : ''}${Math.round(r.avg_visibility_change)} points`,
        detail: `Measured across ${r.verified_n} verified follow-up audits after the change was marked implemented.`,
        metric: `${r.avg_visibility_change > 0 ? '+' : ''}${Math.round(r.avg_visibility_change)}`, confidence: null,
        sampleSize: r.verified_n, direction: r.avg_visibility_change > 0 ? 'positive' : 'negative',
      })
    }
  }

  for (const s of segments) {
    if (s.deviation != null && Math.abs(s.deviation) >= MIN_SEG_DELTA && s.n >= MIN_N) {
      discoveries.push({
        id: `bench:${s.segment_type}:${s.segment_key}`, category: 'benchmark',
        headline: `${s.segment_key} (${s.segment_type}) scores ${Math.abs(Math.round(s.deviation))} points ${s.deviation > 0 ? 'above' : 'below'} average`,
        detail: `Average AI visibility ${Math.round(s.avg_vis ?? 0)}/100 vs ${Math.round(overallAvg ?? 0)} overall, across ${s.n} audits.`,
        metric: `${s.deviation > 0 ? '+' : ''}${Math.round(s.deviation)}`, confidence: null,
        sampleSize: s.n, direction: s.deviation > 0 ? 'positive' : 'negative',
      })
    }
  }

  // Top citation source as a discovery when it clearly dominates.
  if (citeTop.length > 0) {
    const totalCites = citeTop.reduce((a, c) => a + Number(c.citations), 0)
    const top = citeTop[0]
    const share = totalCites > 0 ? Number(top.citations) / totalCites : 0
    if (share >= 0.15 && Number(top.audits) >= MIN_N) {
      discoveries.push({
        id: `cite:${top.domain}`, category: 'citation',
        headline: `${top.domain} is the source AI cites most when recommending restaurants`,
        detail: `${Math.round(share * 100)}% of captured citations, across ${top.audits} audits (type: ${top.citation_type}).`,
        metric: `${Math.round(share * 100)}%`, confidence: null,
        sampleSize: Number(top.audits), direction: 'neutral',
      })
    }
  }

  discoveries.sort((a, b) => (b.confidence ?? 0.5) - (a.confidence ?? 0.5) || b.sampleSize - a.sampleSize)

  // ── Freshness + warehouse health ─────────────────────────────────────────────
  const versions = [...new Set(((providers as PRow[]) ?? []).map((p) => `${p.provider} ${p.version}`))].sort()
  const months = idxRows.map((r) => r.month)

  return NextResponse.json({
    ready: true,
    counts: { audits: auditN, responses: responseN, citations: citationN, entities: entityN, recommendations: recN },
    freshness: { latest_audit: auditFresh, latest_response: responseFresh, first_month: months[0] ?? null, last_month: months[months.length - 1] ?? null },
    discoveries,
    providers: providerSeries,
    benchmarks: { overall: overall ? { n: Number(overall.n), avg_vis: overallAvg, median_vis: overall.median_vis == null ? null : Number(overall.median_vis), p90: overall.p90 == null ? null : Number(overall.p90), p25: overall.p25 == null ? null : Number(overall.p25), pct_mentioned: overall.pct_mentioned == null ? null : Number(overall.pct_mentioned) } : null, segments },
    citations: { top: citeTop, trends: citationTrends },
    correlations,
    research,
    competitors: ((competitors as any[]) ?? []).map((c) => ({ normalized_name: c.normalized_name, audits: Number(c.audits), mentions: Number(c.mentions) })),
    cooccurrence: ((cooccurrence as any[]) ?? []).map((p) => ({ name_a: p.name_a, name_b: p.name_b, audits_together: Number(p.audits_together) })),
    recommendationImpact: recImpactRows,
    warehouse: { versions, provider_count: versions.length, gates: { MIN_N, MIN_LIFT, CONF_GATE, MIN_VERIFIED, MIN_SEG_DELTA } },
  })
}
