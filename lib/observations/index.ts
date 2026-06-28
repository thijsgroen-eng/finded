/**
 * Observation Engine — Finded's proprietary knowledge base.
 *
 * Every completed audit contributes ONE anonymized fact-record. Aggregating
 * these over time produces things ChatGPT cannot: real benchmarks per
 * cuisine/city, pattern lift ("HTML menus were mentioned 2.1× more often"),
 * and evidence-backed recommendation confidence — all from Finded's own
 * repeated measurements, never from individual customer data.
 *
 * The aggregation functions are PURE (no I/O) so they're unit-testable and can
 * later power monitoring, agency dashboards and industry reports unchanged.
 */

import { Language } from '@/lib/i18n'

export type FactKey =
  | 'restaurant_schema'
  | 'html_menu'
  | 'faq_present'
  | 'dietary_present'
  | 'reviews_present'
  | 'opening_hours_present'
  | 'location_present'

/** Boolean signal facts we track for pattern analysis, with bilingual labels. */
export const FACTS: { key: FactKey; en: string; nl: string }[] = [
  { key: 'restaurant_schema',    en: 'Restaurant schema',         nl: 'Restaurant-schema' },
  { key: 'html_menu',            en: 'an HTML (crawlable) menu',   nl: 'een HTML-menu (crawlbaar)' },
  { key: 'faq_present',          en: 'FAQ content',                nl: 'FAQ-inhoud' },
  { key: 'dietary_present',      en: 'tagged dietary options',     nl: 'gelabelde dieetopties' },
  { key: 'reviews_present',      en: 'review signals',             nl: 'reviewsignalen' },
  { key: 'opening_hours_present',en: 'structured opening hours',   nl: 'gestructureerde openingstijden' },
  { key: 'location_present',     en: 'clear location signals',     nl: 'duidelijke locatiesignalen' },
]
const FACT_LABEL = (k: FactKey, lang: Language) => {
  const f = FACTS.find((x) => x.key === k)!
  return lang === 'nl' ? f.nl : f.en
}

/** A normalized observation row as the aggregators consume it. */
export interface ObsRow {
  cuisine: string | null
  city: string | null
  mentionedAny: boolean
  mentionFrequency: number | null
  visibilityScore: number | null
  facts: Partial<Record<FactKey, boolean>>
}

// ── Benchmarks ────────────────────────────────────────────────────────────────

export interface Benchmark {
  n: number
  avgVisibility: number | null
  avgMentionFrequency: number | null
  pctMentioned: number          // 0–1
  factRates: Record<FactKey, number>  // 0–1 share that have each fact
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()

/** Aggregate stats over a segment (optionally filtered by cuisine/city). */
export function computeBenchmark(rows: ObsRow[], filter: { cuisine?: string | null; city?: string | null } = {}): Benchmark {
  const fc = norm(filter.cuisine), fci = norm(filter.city)
  const seg = rows.filter((r) => (!fc || norm(r.cuisine) === fc) && (!fci || norm(r.city) === fci))
  const n = seg.length
  const factRates = Object.fromEntries(
    FACTS.map((f) => [f.key, n ? seg.filter((r) => r.facts[f.key]).length / n : 0]),
  ) as Record<FactKey, number>
  return {
    n,
    avgVisibility: mean(seg.map((r) => r.visibilityScore).filter((x): x is number => x != null)),
    avgMentionFrequency: mean(seg.map((r) => r.mentionFrequency).filter((x): x is number => x != null)),
    pctMentioned: n ? seg.filter((r) => r.mentionedAny).length / n : 0,
    factRates,
  }
}

// ── Pattern lift ────────────────────────────────────────────────────────────

export interface Pattern {
  key: FactKey
  /** mention rate among rows that HAVE the fact (0–1). */
  withRate: number
  /** mention rate among rows that LACK the fact (0–1). */
  withoutRate: number
  /** withRate / withoutRate (e.g. 2.1 = "2.1× more often"). */
  lift: number
  nWith: number
  nWithout: number
}

/**
 * For each boolean fact, compare the AI-mention rate of restaurants that have it
 * vs those that don't. Only returns patterns with enough samples in BOTH groups
 * and a meaningful lift — so we never surface a statistic we can't stand behind.
 */
export function computePatterns(rows: ObsRow[], opts: { minGroup?: number; minLift?: number } = {}): Pattern[] {
  const minGroup = opts.minGroup ?? 5
  const minLift = opts.minLift ?? 1.25
  const out: Pattern[] = []
  for (const f of FACTS) {
    const withRows = rows.filter((r) => r.facts[f.key] === true)
    const withoutRows = rows.filter((r) => r.facts[f.key] === false)
    if (withRows.length < minGroup || withoutRows.length < minGroup) continue
    const withRate = withRows.filter((r) => r.mentionedAny).length / withRows.length
    const withoutRate = withoutRows.filter((r) => r.mentionedAny).length / withoutRows.length
    if (withoutRate <= 0) continue
    const lift = withRate / withoutRate
    if (lift < minLift) continue
    out.push({ key: f.key, withRate, withoutRate, lift, nWith: withRows.length, nWithout: withoutRows.length })
  }
  return out.sort((a, b) => b.lift - a.lift)
}

/** Evidence sentence for a pattern (only states measured facts). */
export function patternEvidence(p: Pattern, lang: Language): string {
  const label = FACT_LABEL(p.key, lang)
  const x = p.lift.toFixed(1)
  const total = p.nWith + p.nWithout
  return lang === 'nl'
    ? `Restaurants met ${label} werden ${x}× vaker door AI genoemd (op basis van ${total} gemeten restaurants).`
    : `Restaurants with ${label} were mentioned ${x}× more often by AI (based on ${total} measured restaurants).`
}

export type Confidence = 'High' | 'Medium' | 'Low'
/** Map a measured lift to a confidence band for a recommendation. */
export function liftConfidence(lift: number): Confidence {
  if (lift >= 2) return 'High'
  if (lift >= 1.4) return 'Medium'
  return 'Low'
}

/** Which tracked fact a recommendation fix-type maps to (for benchmarking). */
export const FIXTYPE_FACT: Record<string, FactKey> = {
  schema_jsonld: 'restaurant_schema',
  menu_structure: 'html_menu',
  faq_page: 'faq_present',
  location_page: 'location_present',
  opening_hours: 'opening_hours_present',
  authority_content: 'reviews_present',
}

export interface FactBenchmark { n: number; pct: number; fact: FactKey }

/**
 * Among comparable restaurants that WERE recommended by AI, what share have this
 * fact? Tries the cuisine segment first, falls back to all rows, and returns null
 * when there aren't enough recommended restaurants to say anything honest.
 */
export function factBenchmark(rows: ObsRow[], fact: FactKey, filter: { cuisine?: string | null } = {}, minRecommended = 10): FactBenchmark | null {
  const fc = norm(filter.cuisine)
  const consider = (subset: ObsRow[]): FactBenchmark | null => {
    const rec = subset.filter((r) => r.mentionedAny)
    if (rec.length < minRecommended) return null
    return { n: rec.length, pct: rec.filter((r) => r.facts[fact]).length / rec.length, fact }
  }
  if (fc) {
    const seg = consider(rows.filter((r) => norm(r.cuisine) === fc))
    if (seg) return seg
  }
  return consider(rows)
}

/** Bilingual benchmark sentence for a recommendation. */
export function benchmarkSentence(b: FactBenchmark, lang: Language): string {
  const f = FACTS.find((x) => x.key === b.fact)!
  const label = lang === 'nl' ? f.nl : f.en
  const p = Math.round(b.pct * 100)
  return lang === 'nl'
    ? `${p}% van de vergelijkbare restaurants die door AI worden aanbevolen, hebben ${label} (gemeten over ${b.n} audits).`
    : `${p}% of comparable restaurants recommended by AI have ${label} (across ${b.n} completed audits).`
}

// ── Build + record (server) ───────────────────────────────────────────────────

export interface ObservationInput {
  auditId: string
  restaurantId: string | null
  city: string | null
  cuisine: string | null
  country: string | null
  businessType: string | null
  visibilityScore: number | null
  mentionFrequency: number | null
  mentionedAny: boolean
  menuFormat?: string | null
  schemaPresent?: boolean
  restaurantSchema?: boolean
  faqPresent?: boolean
  dietaryPresent?: boolean
  reviewsPresent?: boolean
  openingHoursPresent?: boolean
  locationPresent?: boolean
  /** which providers mentioned the target (for cross-model stats later) */
  mentionedBy?: Partial<Record<'openai' | 'anthropic' | 'gemini' | 'perplexity', boolean>>
  /** Methodology stamp (#11): the algorithm versions that produced this row, so
   *  benchmarks/trends can be segmented by version. */
  algoVersions?: { scoring: string; parser: string; extraction: string; recommendation: string; benchmark: string }
}

const PROVIDERS = ['openai', 'anthropic', 'gemini', 'perplexity'] as const

/** Pure: the facts object stored on the observation. */
export function buildObservationFacts(i: ObservationInput): Record<string, boolean | string> {
  return {
    restaurant_schema: !!(i.restaurantSchema ?? i.schemaPresent),
    html_menu: i.menuFormat === 'html',
    menu_format: i.menuFormat ?? 'none',
    faq_present: !!i.faqPresent,
    dietary_present: !!i.dietaryPresent,
    reviews_present: !!i.reviewsPresent,
    opening_hours_present: !!i.openingHoursPresent,
    location_present: !!i.locationPresent,
    mentioned_openai: !!i.mentionedBy?.openai,
    mentioned_anthropic: !!i.mentionedBy?.anthropic,
    mentioned_gemini: !!i.mentionedBy?.gemini,
    mentioned_perplexity: !!i.mentionedBy?.perplexity,
  }
}

/** Map a stored observation row (jsonb facts) into the aggregator's ObsRow. */
export function toObsRow(r: { cuisine: string | null; city: string | null; mentioned_any: boolean | null; mention_frequency: number | null; visibility_score: number | null; facts: Record<string, unknown> | null }): ObsRow {
  const f = r.facts ?? {}
  const b = (k: string) => f[k] === true
  return {
    cuisine: r.cuisine, city: r.city,
    mentionedAny: !!r.mentioned_any,
    mentionFrequency: r.mention_frequency != null ? Number(r.mention_frequency) : null,
    visibilityScore: r.visibility_score != null ? Number(r.visibility_score) : null,
    facts: {
      restaurant_schema: b('restaurant_schema'),
      html_menu: b('html_menu'),
      faq_present: b('faq_present'),
      dietary_present: b('dietary_present'),
      reviews_present: b('reviews_present'),
      opening_hours_present: b('opening_hours_present'),
      location_present: b('location_present'),
    },
  }
}

/** Upsert the anonymized observation for a completed audit (idempotent per audit). */
export async function recordObservation(i: ObservationInput): Promise<void> {
  const { supabaseAdmin } = await import('@/lib/supabase/client')
  await supabaseAdmin.from('observations').upsert({
    audit_id: i.auditId,
    restaurant_id: i.restaurantId,
    city: i.city,
    cuisine: i.cuisine,
    country: i.country,
    business_type: i.businessType,
    visibility_score: i.visibilityScore,
    mention_frequency: i.mentionFrequency,
    mentioned_any: i.mentionedAny,
    facts: buildObservationFacts(i),
    algo_versions: i.algoVersions ?? null,
    scoring_version: i.algoVersions?.scoring ?? null,
    benchmark_version: i.algoVersions?.benchmark ?? null,
  }, { onConflict: 'audit_id' })
}

export interface ObservationChange {
  visibilityDelta: number | null
  mentionFrequencyDelta: number | null
  factsChanged: Record<string, { from: boolean; to: boolean }>
  providersChanged: Record<string, { from: boolean; to: boolean }>
  prevAuditId: string | null
}

/**
 * Record what CHANGED since the restaurant's previous audit (#11) — visibility
 * delta, which signals flipped, which providers started/stopped mentioning it.
 * Append-only (idempotent per audit). This is the data foundation for monitoring
 * trends without re-running audits. No-op on a restaurant's first audit.
 *
 * Must be called AFTER recordObservation for this audit (it looks up the prior
 * observation, excluding the current one).
 */
export async function recordObservationChange(i: ObservationInput): Promise<ObservationChange | null> {
  if (!i.restaurantId) return null
  const { supabaseAdmin } = await import('@/lib/supabase/client')
  const { data: prev } = await supabaseAdmin
    .from('observations')
    .select('audit_id, visibility_score, mention_frequency, facts')
    .eq('restaurant_id', i.restaurantId)
    .neq('audit_id', i.auditId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!prev) return null

  const curFacts = buildObservationFacts(i)
  const prevFacts = (prev.facts ?? {}) as Record<string, unknown>
  const bool = (v: unknown) => v === true

  const factsChanged: Record<string, { from: boolean; to: boolean }> = {}
  for (const f of FACTS) {
    const to = bool(curFacts[f.key]), from = bool(prevFacts[f.key])
    if (to !== from) factsChanged[f.key] = { from, to }
  }
  const providersChanged: Record<string, { from: boolean; to: boolean }> = {}
  for (const p of PROVIDERS) {
    const k = `mentioned_${p}`
    const to = bool(curFacts[k]), from = bool(prevFacts[k])
    if (to !== from) providersChanged[p] = { from, to }
  }

  const num = (v: unknown) => (v != null ? Number(v) : null)
  const curVis = i.visibilityScore, prevVis = num(prev.visibility_score)
  const curMf = i.mentionFrequency, prevMf = num(prev.mention_frequency)
  const change: ObservationChange = {
    visibilityDelta: curVis != null && prevVis != null ? curVis - prevVis : null,
    mentionFrequencyDelta: curMf != null && prevMf != null ? curMf - prevMf : null,
    factsChanged, providersChanged, prevAuditId: prev.audit_id,
  }

  await supabaseAdmin.from('observation_changes').upsert({
    audit_id: i.auditId,
    restaurant_id: i.restaurantId,
    prev_audit_id: change.prevAuditId,
    visibility_delta: change.visibilityDelta,
    mention_frequency_delta: change.mentionFrequencyDelta,
    facts_changed: factsChanged,
    providers_changed: providersChanged,
  }, { onConflict: 'audit_id' })

  return change
}

/**
 * One-time backfill: replay existing completed audits into the Observation
 * Engine (idempotent — upserts per audit, so safe to run repeatedly). Lets the
 * knowledge base benefit from audits run before the engine existed.
 */
export async function backfillObservations(limit = 2000): Promise<{ scanned: number; recorded: number; skipped: number }> {
  const { supabaseAdmin } = await import('@/lib/supabase/client')
  const { data: audits } = await supabaseAdmin
    .from('audits')
    .select('id, restaurant_id, status, restaurant:restaurants(city, cuisine, country)')
    .eq('status', 'completed')
    .limit(limit)

  let recorded = 0, skipped = 0
  for (const a of (audits ?? []) as any[]) {
    const r = (a.restaurant ?? {}) as { city?: string | null; cuisine?: string | null; country?: string | null }
    const [{ data: vs }, { data: wa }, { data: ms }] = await Promise.all([
      supabaseAdmin.from('visibility_scores').select('visibility_score, mention_frequency').eq('audit_id', a.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('website_audits').select('schema_present, schema_types, menu_format, faq_present, dietary, review_signals, review_count, opening_hours_present, location_present, contact_present').eq('audit_id', a.id).limit(1).maybeSingle(),
      supabaseAdmin.from('mentions').select('model, mentioned').eq('audit_id', a.id),
    ])
    if (!vs) { skipped++; continue }  // no score → nothing measurable to contribute
    const mentions = ms ?? []
    const schemaTypes = ((wa?.schema_types ?? []) as string[]).map((t) => t.toLowerCase())
    await recordObservation({
      auditId: a.id,
      restaurantId: a.restaurant_id ?? null,
      city: r.city ?? null,
      cuisine: r.cuisine ?? null,
      country: r.country ?? null,
      businessType: 'restaurant',
      visibilityScore: vs.visibility_score != null ? Number(vs.visibility_score) : null,
      mentionFrequency: vs.mention_frequency != null ? Number(vs.mention_frequency) : null,
      mentionedAny: mentions.some((m: any) => m.mentioned),
      menuFormat: wa?.menu_format ?? null,
      schemaPresent: !!wa?.schema_present,
      restaurantSchema: schemaTypes.some((t) => t.includes('restaurant') || t.includes('localbusiness')),
      faqPresent: !!wa?.faq_present,
      dietaryPresent: ((wa?.dietary as string[] | null)?.length ?? 0) > 0,
      reviewsPresent: !!wa?.review_signals || (wa?.review_count ?? 0) > 0,
      openingHoursPresent: !!wa?.opening_hours_present,
      locationPresent: !!(wa?.location_present || wa?.contact_present),
      mentionedBy: {
        openai: mentions.some((m: any) => m.model === 'openai' && m.mentioned),
        anthropic: mentions.some((m: any) => m.model === 'anthropic' && m.mentioned),
        gemini: mentions.some((m: any) => m.model === 'gemini' && m.mentioned),
        perplexity: mentions.some((m: any) => m.model === 'perplexity' && m.mentioned),
      },
    })
    recorded++
  }
  return { scanned: (audits ?? []).length, recorded, skipped }
}

export interface PlatformStats {
  audits: number; restaurants: number; cities: number; cuisines: number; searches: number; models: number
  n: number; pctMentioned: number; factRates: Record<FactKey, number>
}

/**
 * Headline platform counters for the homepage ("Finded Insights"). Aggregate
 * only. Grows automatically as audits complete — drives the live proof that
 * Finded continuously measures AI recommendations.
 */
export async function platformStats(): Promise<PlatformStats> {
  const { supabaseAdmin } = await import('@/lib/supabase/client')
  const [{ data: obs }, runs] = await Promise.all([
    supabaseAdmin.from('observations').select('restaurant_id, city, cuisine, mentioned_any, facts').limit(5000),
    supabaseAdmin.from('model_runs').select('id', { count: 'exact', head: true }),
  ])
  const rows = (obs ?? []) as any[]
  const bench = computeBenchmark(rows.map((r) => toObsRow(r)))
  const distinct = (vals: (string | null)[]) => new Set(vals.map((v) => norm(v)).filter(Boolean)).size
  return {
    audits: rows.length,
    restaurants: new Set(rows.map((r) => r.restaurant_id).filter(Boolean)).size,
    cities: distinct(rows.map((r) => r.city)),
    cuisines: distinct(rows.map((r) => r.cuisine)),
    searches: runs.count ?? 0,
    models: 4,
    n: bench.n, pctMentioned: bench.pctMentioned, factRates: bench.factRates,
  }
}

/** Load all observation rows as ObsRows (server). */
export async function loadObservations(): Promise<ObsRow[]> {
  const { supabaseAdmin } = await import('@/lib/supabase/client')
  const { data } = await supabaseAdmin
    .from('observations')
    .select('cuisine, city, mentioned_any, mention_frequency, visibility_score, facts')
    .limit(5000)
  return (data ?? []).map(toObsRow)
}
