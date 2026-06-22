/**
 * ⚠️ ILLUSTRATIVE, NOT EMPIRICALLY VALIDATED. These assumptions convert a
 * "mention gap" (how many more times competitors are recommended than the
 * target) into a rough business-impact range. The multipliers are storytelling
 * assumptions, NOT measured conversion data, and must always be shown with a
 * visible caveat in the UI. Override per deployment when real data exists.
 *
 * Single source of truth for both the numbers and the caveat string. This module
 * has NO server-only imports, so client components (the admin pages) and the
 * server-only metrics engine (metrics-v2.ts) can both import it.
 */

export interface EstimateAssumptions {
  /** Assumed extra monthly visitors gained per additional AI recommendation. */
  visitorsPerMentionMin: number
  visitorsPerMentionMax: number
  /** Assumed visitor → paying customer conversion rate (0–1). */
  conversionRate: number
  /** Assumed average spend per converted customer, in euros. */
  avgSpendEur: number
}

export const DEFAULT_ESTIMATE_ASSUMPTIONS: EstimateAssumptions = {
  visitorsPerMentionMin: 8,
  visitorsPerMentionMax: 25,
  conversionRate: 0.20,
  avgSpendEur: 45,
}

/** Human-readable caveat derived from the assumptions, for display in the UI. */
export function estimateCaveat(a: EstimateAssumptions = DEFAULT_ESTIMATE_ASSUMPTIONS): string {
  return `Illustrative estimate based on an assumed ${Math.round(a.conversionRate * 100)}% conversion rate and €${a.avgSpendEur} average spend — not measured.`
}

/** The caveat string for the default assumptions (what the UI renders). */
export const ESTIMATE_CAVEAT = estimateCaveat()

export interface OpportunityEstimate {
  visitors_min: number
  visitors_max: number
  revenue_min: number
  revenue_max: number
}

/** Illustrative only — see EstimateAssumptions. */
export function estimateOpportunity(
  mentionGap: number,
  a: EstimateAssumptions = DEFAULT_ESTIMATE_ASSUMPTIONS
): OpportunityEstimate {
  const gap = Math.max(0, mentionGap)
  const visitors_min = Math.round(gap * a.visitorsPerMentionMin)
  const visitors_max = Math.round(gap * a.visitorsPerMentionMax)
  return {
    visitors_min,
    visitors_max,
    revenue_min: Math.round((visitors_min * a.conversionRate * a.avgSpendEur) / 100) * 100,
    revenue_max: Math.round((visitors_max * a.conversionRate * a.avgSpendEur) / 100) * 100,
  }
}
