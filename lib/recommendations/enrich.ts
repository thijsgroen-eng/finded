import { asFixType } from '@/lib/engine/fix-types'
import { asLevel, computePriorityRank } from '@/lib/audit/recommendation-priority'
import { factBenchmark, benchmarkSentence, FIXTYPE_FACT, ObsRow } from '@/lib/observations'
import { RECOMMENDATION_VERSION } from '@/lib/versions'
import type { Language } from '@/lib/i18n'

/**
 * Recommendation enrichment — the DETERMINISTIC layer (#8).
 *
 * The LLM only writes prose (title/what/why/evidence/impact). Every NUMBER and
 * classification — fix type, impact/effort levels, priority rank, the measured
 * benchmark, data-source attribution, and the confidence band — is computed here,
 * in pure code, from the audit + Observation Engine. The model never calculates.
 *
 * Pure + deterministic → unit-tested in tests/recommendations.test.ts.
 */

export interface RawRecommendation {
  title?: string
  what?: string
  why?: string
  evidence?: string
  impact?: string
  type?: string
  impact_level?: string
  priority?: string
  effort?: string
  difficulty?: string
  confidence?: string
}

export interface EnrichContext {
  auditId: string
  restaurantId: string
  cuisine: string | null
  language: Language
  obsRows: ObsRow[]
}

/** A recommendation row ready to insert into `recommendations`. */
export function enrichRecommendation(rec: RawRecommendation, ctx: EnrichContext) {
  const fixType = asFixType(rec.type) // backend-authoritative, enum-validated (null if invalid)
  const impactLevel = asLevel(rec.impact_level ?? rec.priority)
  const effort = asLevel(rec.effort)
  const priorityRank = computePriorityRank(impactLevel, effort)

  // Deterministic, never-fabricated benchmark for this rec's signal.
  const fact = fixType ? FIXTYPE_FACT[fixType] : undefined
  const bm = fact ? factBenchmark(ctx.obsRows, fact, { cuisine: ctx.cuisine }) : null
  const benchmark = bm
    ? benchmarkSentence(bm, ctx.language)
    : (ctx.language === 'nl' ? 'Benchmarkgegevens komen beschikbaar zodra meer restaurants zijn geanalyseerd.' : 'Benchmark data will become available as more restaurants are analysed.')
  const dataSource = bm
    ? (ctx.language === 'nl' ? 'Directe audit + Finded-benchmark' : 'Direct audit + Finded benchmark')
    : (ctx.language === 'nl' ? 'Alleen directe audit' : 'Direct audit only')
  // Confidence is data-backed when a benchmark exists; otherwise trust the model's (capped at medium).
  const confidence = bm ? (bm.pct >= 0.7 ? 'high' : 'medium') : (asLevel(rec.confidence) === 'high' ? 'medium' : asLevel(rec.confidence))

  return {
    audit_id: ctx.auditId,
    restaurant_id: ctx.restaurantId,
    type: fixType,
    title: rec.title,
    description: rec.what,
    why: rec.why ?? null,
    evidence: rec.evidence ?? null,
    priority: impactLevel,            // keep priority = impact for existing UI colours
    impact: rec.impact,
    difficulty: rec.difficulty ?? null,
    status: 'pending',
    suggested_fix: rec.what ?? null,
    expected_impact: rec.impact ?? null,
    asset_type: fixType,
    impact_level: impactLevel,        // Prioritisation (014): Impact × Effort → where to start.
    effort,
    priority_rank: priorityRank,
    confidence,                       // data-backed confidence band (020)
    data_source: dataSource,          // where the support came from (021)
    benchmark,                        // measured benchmark sentence (021)
    algo_version: RECOMMENDATION_VERSION, // reproducibility stamp (#1)
  }
}

/** Shape a stored recommendation row for the API response (stable contract). */
export function shapeStoredRec(r: Record<string, any>, fallback?: RawRecommendation) {
  return {
    id: r.id,
    type: r.type ?? null,
    priority: r.priority ?? 'medium',
    impact_level: r.impact_level ?? r.priority ?? 'medium',
    effort: r.effort ?? 'medium',
    priority_rank: r.priority_rank ?? 'do_next',
    confidence: r.confidence ?? null,
    data_source: r.data_source ?? null,
    benchmark: r.benchmark ?? null,
    title: r.title ?? fallback?.title,
    what: r.description ?? fallback?.what,
    why: r.why ?? '',
    evidence: r.evidence ?? null,
    impact: r.impact ?? '',
    suggested_fix: r.suggested_fix ?? r.description ?? null,
    expected_impact: r.expected_impact ?? r.impact ?? null,
    asset_type: r.asset_type ?? r.type ?? null,
    status: r.status ?? 'pending',
  }
}
