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
}

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
  }, { onConflict: 'audit_id' })
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

/** Load all observation rows as ObsRows (server). */
export async function loadObservations(): Promise<ObsRow[]> {
  const { supabaseAdmin } = await import('@/lib/supabase/client')
  const { data } = await supabaseAdmin
    .from('observations')
    .select('cuisine, city, mentioned_any, mention_frequency, visibility_score, facts')
    .limit(5000)
  return (data ?? []).map(toObsRow)
}
