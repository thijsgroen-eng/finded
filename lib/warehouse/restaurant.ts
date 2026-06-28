import { supabaseAdmin } from '@/lib/supabase/client'
import { twoPropTest, slope, stddev } from '@/lib/warehouse/stats'

/**
 * Observation Engine V2 — per-restaurant intelligence (deterministic, no LLM).
 *
 * Powers the customer monitoring dashboard. Reads ONLY warehouse tables and
 * materialized views (fact_*, dim_*, mv_*) — never operational tables. Every
 * figure is reproducible: changes are diffs between this restaurant's own
 * warehouse audits; opportunities and industry findings come from the gated
 * signal-correlation view; benchmarks come from mv_benchmark. The UI renders
 * what it gets and never invents.
 *
 * Tolerant: if the warehouse has no rows for this restaurant (not backfilled)
 * it returns { ready: false } so the dashboard falls back to its operational
 * view. Best-effort — callers wrap in try/catch so it never breaks a dashboard.
 */

// Significance / sampling gates — identical meaning to the admin intelligence hub.
const MIN_N = 10
const CONF_GATE = 0.9
const MONTH_MS = 30 * 24 * 60 * 60 * 1000

// The website signals we measure, mapped to the dim_feature_snapshot column,
// the mv_signal_correlation key (same name), and a deterministic effort estimate.
export const SIGNAL_DEFS = [
  { key: 'menu_detected', label: 'HTML menu', difficulty: 'easy', minutes: 30 },
  { key: 'schema_detected', label: 'Restaurant schema', difficulty: 'medium', minutes: 90 },
  { key: 'reservation_widget', label: 'Reservation widget', difficulty: 'medium', minutes: 60 },
  { key: 'faq_detected', label: 'FAQ page', difficulty: 'easy', minutes: 45 },
  { key: 'opening_hours', label: 'Opening hours', difficulty: 'easy', minutes: 15 },
  { key: 'review_links', label: 'Review signals', difficulty: 'easy', minutes: 20 },
  { key: 'social_links', label: 'Social links', difficulty: 'easy', minutes: 10 },
] as const
type SignalKey = typeof SIGNAL_DEFS[number]['key']

export type ChangeKind = 'visibility' | 'mention' | 'provider' | 'signal' | 'competitor'
export interface Change {
  kind: ChangeKind
  dir: 'up' | 'down' | 'neutral'
  positive: boolean
  value?: number            // magnitude (points / percentage / count)
  subject?: string          // provider name, signal label, competitor name
}

export interface Opportunity {
  key: string
  label: string
  expectedGainPct: number   // (lift − 1) × 100, from measured mention rates
  visibilityDelta: number | null
  confidence: number        // two-proportion z-test, 0–1
  measured: number          // restaurants on both sides of the comparison
  difficulty: string
  minutes: number
}

export interface BenchmarkRow {
  scope: 'overall' | 'cuisine' | 'city'
  key: string
  n: number
  avg: number | null
  top10: number | null      // p90
  bottom: number | null     // p25
  recRate: number | null    // pct_mentioned (0–1)
}

export interface ProviderDetail {
  provider: string
  latestRate: number        // 0–1
  trend: 'up' | 'down' | 'flat'
  driftPts: number          // latest − first, in points
  stability: number         // stddev of the rate series (lower = more stable)
  avgPosition: number | null
  responses: number
  citations: { domain: string; type: string; count: number }[]
  series: { month: string; rate: number }[]
}

export interface Finding {
  id: string
  kind: 'correlation' | 'trend'
  dir: 'up' | 'down'
  metricPct: number         // effect size, %
  subject: string           // signal label / "AI visibility"
  measured: number          // sample size
  confidence: number | null
}

export interface HistoryPoint {
  date: string
  score: number
  delta: number | null
  events: { kind: 'signal_added' | 'signal_removed'; label: string }[]
}

export interface RestaurantIntel {
  ready: boolean
  auditCount: number
  current: { score: number | null; recRate: number | null; auditedAt: string | null }
  deltas: { sinceLast: number | null; monthly: number | null }
  changes: Change[]
  opportunities: Opportunity[]
  benchmarks: BenchmarkRow[]
  providers: ProviderDetail[]
  industry: Finding[]
  research: Finding[]
  history: HistoryPoint[]
}

const PROVIDER_LABEL: Record<string, string> = { openai: 'ChatGPT', anthropic: 'Claude', gemini: 'Gemini', perplexity: 'Perplexity' }
const monthOf = (ts: string) => ts.slice(0, 7)

/** Build the deterministic intelligence bundle for one restaurant. */
export async function getRestaurantIntel(restaurantId: string): Promise<RestaurantIntel> {
  const empty: RestaurantIntel = {
    ready: false, auditCount: 0,
    current: { score: null, recRate: null, auditedAt: null },
    deltas: { sinceLast: null, monthly: null },
    changes: [], opportunities: [], benchmarks: [], providers: [], industry: [], research: [], history: [],
  }

  const safe = async <T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T | null> => {
    try { const { data, error } = await p; return error ? null : data } catch { return null }
  }

  // This restaurant's own audit rollups (warehouse, append-only, chronological).
  const audits = (await safe(supabaseAdmin
    .from('fact_audit')
    .select('audit_id, observed_at, visibility_score, mention_frequency, mentioned_any, feature_snapshot_id')
    .eq('restaurant_id', restaurantId)
    .order('observed_at', { ascending: true })) as any[] | null) ?? []

  if (audits.length === 0) return empty

  const last = audits[audits.length - 1]
  const prev = audits.length >= 2 ? audits[audits.length - 2] : null
  const lastTs = new Date(last.observed_at).getTime()
  const monthlyBase = [...audits].reverse().find((a) => lastTs - new Date(a.observed_at).getTime() >= MONTH_MS) ?? null

  const num = (x: unknown) => x == null ? null : Number(x)
  const scoreOf = (a: any) => { const v = num(a?.visibility_score); return v == null ? null : Math.round(v) }

  // ── Dimensions, provider responses, snapshots, citations, competitors, MVs ──
  const [dimR, snaps, presp, dprov, citations, entities, benchmark, signals, researchIdx] = await Promise.all([
    safe(supabaseAdmin.from('dim_restaurant').select('cuisine, city').eq('restaurant_id', restaurantId).maybeSingle()),
    safe(supabaseAdmin.from('dim_feature_snapshot').select('id, schema_detected, menu_detected, reservation_widget, opening_hours, faq_detected, review_links, social_links').eq('restaurant_id', restaurantId)),
    safe(supabaseAdmin.from('fact_provider_response').select('provider_id, audit_id, mentioned, mention_position, observed_at').eq('restaurant_id', restaurantId)),
    safe(supabaseAdmin.from('dim_provider').select('id, provider')),
    safe(supabaseAdmin.from('fact_citation').select('provider_id, domain, citation_type, audit_id').eq('restaurant_id', restaurantId).eq('audit_id', last.audit_id)),
    safe(supabaseAdmin.from('fact_entity').select('normalized_name, audit_id').eq('restaurant_id', restaurantId).eq('is_target', false)),
    safe(supabaseAdmin.from('mv_benchmark').select('*')),
    safe(supabaseAdmin.from('mv_signal_correlation').select('*')),
    safe(supabaseAdmin.from('research_ai_visibility_index').select('month, n, avg_visibility').order('month', { ascending: true })),
  ])

  const cuisine = (dimR as any)?.cuisine ? String((dimR as any).cuisine).toLowerCase() : null
  const city = (dimR as any)?.city ? String((dimR as any).city).toLowerCase() : null
  const snapById = new Map<string, any>(((snaps as any[]) ?? []).map((s) => [s.id, s]))
  const providerName = new Map<string, string>(((dprov as any[]) ?? []).map((p) => [p.id, p.provider]))

  // ── Provider response aggregation: per audit and per provider ────────────────
  type Agg = { mentions: number; total: number; posSum: number; posN: number }
  const perAuditProvider = new Map<string, Map<string, Agg>>()  // audit_id → provider → agg
  const perProviderMonth = new Map<string, Map<string, Agg>>()  // provider → month → agg
  const auditTs = new Map<string, string>(audits.map((a) => [a.audit_id, a.observed_at]))
  for (const r of ((presp as any[]) ?? [])) {
    const prov = providerName.get(r.provider_id) ?? 'unknown'
    const ap = perAuditProvider.get(r.audit_id) ?? new Map(); perAuditProvider.set(r.audit_id, ap)
    const a = ap.get(prov) ?? { mentions: 0, total: 0, posSum: 0, posN: 0 }; ap.set(prov, a)
    a.total++; if (r.mentioned) a.mentions++
    if (r.mention_position != null) { a.posSum += Number(r.mention_position); a.posN++ }
    const month = monthOf(auditTs.get(r.audit_id) ?? r.observed_at)
    const pm = perProviderMonth.get(prov) ?? new Map(); perProviderMonth.set(prov, pm)
    const m = pm.get(month) ?? { mentions: 0, total: 0, posSum: 0, posN: 0 }; pm.set(month, m)
    m.total++; if (r.mentioned) m.mentions++; if (r.mention_position != null) { m.posSum += Number(r.mention_position); m.posN++ }
  }
  const rate = (a: Agg | undefined) => a && a.total > 0 ? a.mentions / a.total : 0

  // ── CHANGES (deterministic diff of the last two audits) ──────────────────────
  const changes: Change[] = []
  const sLast = scoreOf(last), sPrev = prev ? scoreOf(prev) : null
  if (sLast != null && sPrev != null && sLast !== sPrev) {
    changes.push({ kind: 'visibility', dir: sLast > sPrev ? 'up' : 'down', positive: sLast > sPrev, value: Math.abs(sLast - sPrev) })
  }
  if (prev) {
    const lastAP = perAuditProvider.get(last.audit_id) ?? new Map<string, Agg>()
    const prevAP = perAuditProvider.get(prev.audit_id) ?? new Map<string, Agg>()
    const provs = new Set<string>([...lastAP.keys(), ...prevAP.keys()])
    for (const prov of provs) {
      const rl = rate(lastAP.get(prov)), rp = rate(prevAP.get(prov))
      if (rp === 0 && rl > 0) changes.push({ kind: 'provider', dir: 'up', positive: true, subject: PROVIDER_LABEL[prov] ?? prov })
      else if (rp > 0 && rl === 0) changes.push({ kind: 'provider', dir: 'down', positive: false, subject: PROVIDER_LABEL[prov] ?? prov })
    }
    // Signal diffs from feature snapshots.
    const ls = last.feature_snapshot_id ? snapById.get(last.feature_snapshot_id) : null
    const ps = prev.feature_snapshot_id ? snapById.get(prev.feature_snapshot_id) : null
    if (ls && ps) {
      for (const def of SIGNAL_DEFS) {
        const a = !!ls[def.key], b = !!ps[def.key]
        if (a && !b) changes.push({ kind: 'signal', dir: 'up', positive: true, subject: def.label })
        else if (!a && b) changes.push({ kind: 'signal', dir: 'down', positive: false, subject: def.label })
      }
    }
    // Mention frequency move.
    const ml = num(last.mention_frequency), mp = num(prev.mention_frequency)
    if (ml != null && mp != null && Math.abs(ml - mp) >= 0.05) {
      changes.push({ kind: 'mention', dir: ml > mp ? 'up' : 'down', positive: ml > mp, value: Math.round(Math.abs(ml - mp) * 100) })
    }
  }

  // ── OPPORTUNITIES (missing signals × gated correlation lift) ─────────────────
  const corrByKey = new Map<string, any>(((signals as any[]) ?? []).map((s) => [s.signal, s]))
  const latestSnap = last.feature_snapshot_id ? snapById.get(last.feature_snapshot_id) : null
  const opportunities: Opportunity[] = []
  for (const def of SIGNAL_DEFS) {
    if (latestSnap && latestSnap[def.key as SignalKey]) continue   // already present
    const s = corrByKey.get(def.key); if (!s) continue
    const nWith = Number(s.n_with ?? 0), nWithout = Number(s.n_without ?? 0)
    const rWith = Number(s.ment_with ?? 0), rWithout = Number(s.ment_without ?? 0)
    if (nWith < MIN_N || nWithout < MIN_N || rWithout <= 0) continue
    const lift = rWith / rWithout
    const { confidence } = twoPropTest(Math.round(rWith * nWith), nWith, Math.round(rWithout * nWithout), nWithout)
    if (lift <= 1 || confidence < CONF_GATE) continue
    const visDelta = s.vis_with != null && s.vis_without != null ? Math.round(Number(s.vis_with) - Number(s.vis_without)) : null
    opportunities.push({
      key: def.key, label: def.label, expectedGainPct: Math.round((lift - 1) * 100),
      visibilityDelta: visDelta, confidence, measured: nWith + nWithout, difficulty: def.difficulty, minutes: def.minutes,
    })
  }
  opportunities.sort((a, b) => b.expectedGainPct * b.confidence - a.expectedGainPct * a.confidence)

  // ── BENCHMARKS (overall + this restaurant's cuisine + city) ──────────────────
  const bRows = ((benchmark as any[]) ?? [])
  const pick = (type: string, key: string): BenchmarkRow | null => {
    const r = bRows.find((x) => x.segment_type === type && String(x.segment_key).toLowerCase() === key)
    if (!r) return null
    return {
      scope: type as BenchmarkRow['scope'], key, n: Number(r.n),
      avg: r.avg_vis == null ? null : Math.round(Number(r.avg_vis)),
      top10: r.p90 == null ? null : Math.round(Number(r.p90)),
      bottom: r.p25 == null ? null : Math.round(Number(r.p25)),
      recRate: r.pct_mentioned == null ? null : Number(r.pct_mentioned),
    }
  }
  const benchmarks = [pick('overall', 'all'), cuisine ? pick('cuisine', cuisine) : null, city ? pick('city', city) : null].filter(Boolean) as BenchmarkRow[]

  // ── PROVIDER DETAIL (trend, stability, citations) ────────────────────────────
  const citeByProvider = new Map<string, Map<string, { type: string; count: number }>>()
  for (const c of ((citations as any[]) ?? [])) {
    const prov = providerName.get(c.provider_id) ?? 'unknown'
    const m = citeByProvider.get(prov) ?? new Map(); citeByProvider.set(prov, m)
    const e = m.get(c.domain) ?? { type: c.citation_type, count: 0 }; e.count++; m.set(c.domain, e)
  }
  const providers: ProviderDetail[] = [...perProviderMonth.entries()].map(([prov, months]) => {
    const series = [...months.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, a]) => ({ month, rate: rate(a) }))
    const rates = series.map((s) => s.rate)
    const drift = rates.length >= 2 ? rates[rates.length - 1] - rates[0] : 0
    const sl = slope(rates)
    const totalAgg = [...months.values()].reduce((acc, a) => ({ mentions: acc.mentions + a.mentions, total: acc.total + a.total, posSum: acc.posSum + a.posSum, posN: acc.posN + a.posN }), { mentions: 0, total: 0, posSum: 0, posN: 0 })
    const cites = [...(citeByProvider.get(prov)?.entries() ?? [])].map(([domain, v]) => ({ domain, type: v.type, count: v.count })).sort((a, b) => b.count - a.count).slice(0, 5)
    return {
      provider: PROVIDER_LABEL[prov] ?? prov,
      latestRate: rates[rates.length - 1] ?? 0,
      trend: (Math.abs(sl) < 0.01 ? 'flat' : sl > 0 ? 'up' : 'down') as ProviderDetail['trend'],
      driftPts: Math.round(drift * 100), stability: stddev(rates),
      avgPosition: totalAgg.posN > 0 ? totalAgg.posSum / totalAgg.posN : null,
      responses: totalAgg.total, citations: cites, series,
    }
  }).sort((a, b) => b.latestRate - a.latestRate)

  // ── INDUSTRY (significant correlations) + RESEARCH (index trend) ─────────────
  const industry: Finding[] = []
  for (const def of SIGNAL_DEFS) {
    const s = corrByKey.get(def.key); if (!s) continue
    const nWith = Number(s.n_with ?? 0), nWithout = Number(s.n_without ?? 0)
    const rWith = Number(s.ment_with ?? 0), rWithout = Number(s.ment_without ?? 0)
    if (nWith < MIN_N || nWithout < MIN_N || rWithout <= 0) continue
    const lift = rWith / rWithout
    const { confidence } = twoPropTest(Math.round(rWith * nWith), nWith, Math.round(rWithout * nWithout), nWithout)
    if (Math.abs(lift - 1) < 0.1 || confidence < CONF_GATE) continue
    industry.push({
      id: `corr:${def.key}`, kind: 'correlation', dir: lift >= 1 ? 'up' : 'down',
      metricPct: Math.abs(Math.round((lift - 1) * 100)), subject: def.label,
      measured: nWith + nWithout, confidence,
    })
  }
  industry.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))

  const research: Finding[] = []
  const idx = ((researchIdx as any[]) ?? []).map((r) => ({ month: r.month, n: Number(r.n), avg: r.avg_visibility == null ? null : Number(r.avg_visibility) }))
  if (idx.length >= 3) {
    const vals = idx.map((r) => r.avg ?? 0)
    const sl = slope(vals)
    if (Math.abs(sl) >= 0.5) {
      research.push({
        id: 'research:index', kind: 'trend', dir: sl > 0 ? 'up' : 'down',
        metricPct: Math.abs(Math.round(sl * 10) / 10), subject: 'AI visibility',
        measured: idx.reduce((a, r) => a + r.n, 0), confidence: null,
      })
    }
  }

  // ── VISIBILITY HISTORY (annotated with signal-change events) ─────────────────
  const history: HistoryPoint[] = audits.map((a, i) => {
    const score = scoreOf(a) ?? 0
    const prevScore = i > 0 ? scoreOf(audits[i - 1]) : null
    const events: HistoryPoint['events'] = []
    if (i > 0) {
      const cur = a.feature_snapshot_id ? snapById.get(a.feature_snapshot_id) : null
      const pr = audits[i - 1].feature_snapshot_id ? snapById.get(audits[i - 1].feature_snapshot_id) : null
      if (cur && pr) for (const def of SIGNAL_DEFS) {
        if (!!cur[def.key] && !pr[def.key]) events.push({ kind: 'signal_added', label: def.label })
        else if (!cur[def.key] && !!pr[def.key]) events.push({ kind: 'signal_removed', label: def.label })
      }
    }
    return { date: a.observed_at, score, delta: prevScore == null ? null : score - prevScore, events }
  })

  return {
    ready: true, auditCount: audits.length,
    current: { score: sLast, recRate: num(last.mention_frequency), auditedAt: last.observed_at },
    deltas: {
      sinceLast: sLast != null && sPrev != null ? sLast - sPrev : null,
      monthly: sLast != null && monthlyBase && scoreOf(monthlyBase) != null ? sLast - scoreOf(monthlyBase)! : null,
    },
    changes, opportunities, benchmarks, providers, industry, research, history,
  }
}
