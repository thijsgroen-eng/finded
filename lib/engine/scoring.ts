/**
 * Transparent AI-visibility scoring.
 *
 * The headline visibility_score (0–100) is a DETERMINISTIC weighted average of
 * named, individually-inspectable components. Every component is derived from
 * stored audit evidence (mentions, positions, competitors, website signals), and
 * the full breakdown is persisted (visibility_scores.score_breakdown) and shown
 * in the report so a customer can see exactly why they scored what they scored.
 *
 * Resilient to missing data: if a component has no evidence (e.g. no competitors
 * were extracted, or no website was crawled) it is DROPPED and the remaining
 * weights are renormalized — never invented or defaulted to a fake number. The
 * confidence_score reflects how much evidence backed the score.
 *
 * Bump METHOD_VERSION whenever the formula/weights change, so historical scores
 * remain interpretable.
 */

// v2: recommendation-visibility first. The score is driven by whether AI actually
// recommends the restaurant and how it compares to competitors + authority — not
// by technical website SEO (which is now a supporting input, not the driver).
export const METHOD_VERSION = 'v2'

export interface ScoreInputs {
  /** Fraction of sampled answers that mentioned the target (0–1). */
  mentionFrequency: number | null
  /** Distinct models that mentioned the target. */
  modelConsensus: number | null
  /** How many providers actually ran (consensus denominator; >=1). */
  providersRan: number
  /** Target's share of all mentions in its market (0–1). null if no competitor data. */
  shareOfVoice: number | null
  /** Authority signal (0–1): AI citation of the restaurant's own site + review signals. */
  authorityScore: number | null
  /** Website AI-readiness: how many key signals are present out of those checked. */
  websiteSignals: { present: number; total: number } | null
  /** Total sampled (model × prompt × sample) cells behind the audit. */
  sampleCount: number
  /** Share of attempted model calls that succeeded (0–1). Drags confidence down
   *  when calls failed. Defaults to 1 (fully reliable) when not provided. */
  completionRate?: number
}

export interface ScoreComponent {
  key: string
  label: string
  score: number   // 0–100
  weight: number  // normalized weight actually applied (0–1)
  detail: string  // plain-English evidence for this component
}

export interface ScoreBreakdown {
  visibility_score: number      // 0–100
  confidence_score: number      // 0–1
  components: ScoreComponent[]
  method_version: string
  formula: string
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))
const round = (n: number) => Math.round(n * 100) / 100

// Base weights (sum 1.0). Renormalized over whichever components have evidence.
// Recommendation visibility (mentions + competitors + consensus) = 60%; authority
// 15%; website clarity/structured-data 25%.
const WEIGHTS = {
  mention_frequency_score: 0.30,
  competitor_gap_score: 0.20,
  model_consensus_score: 0.10,
  authority_score: 0.15,
  website_signal_score: 0.25,
} as const

/** Average rank → 0–100. Rank 1 = 100, then ~18 points per rank down, floored at 0. */
export function positionScoreFromAvg(avgPosition: number): number {
  return clamp(100 - (avgPosition - 1) * 18)
}

export function computeScoreBreakdown(input: ScoreInputs): ScoreBreakdown {
  const raw: Array<Omit<ScoreComponent, 'weight'> & { weight: number; present: boolean }> = []

  // mention_frequency_score
  raw.push({
    key: 'mention_frequency_score', label: 'Mention frequency', weight: WEIGHTS.mention_frequency_score,
    present: input.mentionFrequency != null,
    score: input.mentionFrequency != null ? clamp(input.mentionFrequency * 100) : 0,
    detail: input.mentionFrequency != null
      ? `Mentioned in ${Math.round(input.mentionFrequency * 100)}% of sampled answers.`
      : 'No mention data.',
  })

  // competitor_gap_score (share of voice)
  raw.push({
    key: 'competitor_gap_score', label: 'Share of voice vs competitors', weight: WEIGHTS.competitor_gap_score,
    present: input.shareOfVoice != null,
    score: input.shareOfVoice != null ? clamp(input.shareOfVoice * 100) : 0,
    detail: input.shareOfVoice != null
      ? `${Math.round(input.shareOfVoice * 100)}% of all restaurant mentions in this prompt set.`
      : 'No competitor data extracted.',
  })

  // model_consensus_score (over providers that actually ran)
  const consensusPresent = input.modelConsensus != null && input.providersRan > 0
  raw.push({
    key: 'model_consensus_score', label: 'Model consensus', weight: WEIGHTS.model_consensus_score,
    present: consensusPresent,
    score: consensusPresent ? clamp((input.modelConsensus! / input.providersRan) * 100) : 0,
    detail: consensusPresent
      ? `${input.modelConsensus} of ${input.providersRan} AI models mentioned you.`
      : 'No model data.',
  })

  // authority_score (AI cited your site + review signals)
  raw.push({
    key: 'authority_score', label: 'Authority & citations', weight: WEIGHTS.authority_score,
    present: input.authorityScore != null,
    score: input.authorityScore != null ? clamp(input.authorityScore * 100) : 0,
    detail: input.authorityScore != null
      ? `Authority signals (AI citation of your site + review presence): ${Math.round(input.authorityScore * 100)}%.`
      : 'No authority data.',
  })

  // website_signal_score
  const ws = input.websiteSignals
  const wsPresent = !!ws && ws.total > 0
  raw.push({
    key: 'website_signal_score', label: 'Website signals', weight: WEIGHTS.website_signal_score,
    present: wsPresent,
    score: wsPresent ? clamp((ws!.present / ws!.total) * 100) : 0,
    detail: wsPresent
      ? `${ws!.present} of ${ws!.total} AI-readiness signals present on the website.`
      : 'No website audit available.',
  })

  // Renormalize weights over present components only.
  const present = raw.filter((c) => c.present)
  const totalWeight = present.reduce((s, c) => s + c.weight, 0)

  const components: ScoreComponent[] = present.map((c) => ({
    key: c.key, label: c.label, score: round(c.score),
    weight: totalWeight > 0 ? round(c.weight / totalWeight) : 0,
    detail: c.detail,
  }))

  const visibility_score = totalWeight > 0
    ? Math.round(present.reduce((s, c) => s + c.score * (c.weight / totalWeight), 0))
    : 0

  // Confidence: half from evidence completeness, half from sample size
  // (saturating at 24 sampled answers), then scaled by how many model calls
  // actually succeeded — so a run riddled with provider failures can never read
  // as high-confidence even if the surviving cells look complete. Deterministic, 0–1.
  const completeness = present.length / raw.length
  const sampleFactor = Math.min(1, input.sampleCount / 24)
  const reliabilityFactor = input.completionRate == null ? 1 : Math.max(0, Math.min(1, input.completionRate))
  const confidence_score = round((0.5 * completeness + 0.5 * sampleFactor) * reliabilityFactor)

  return {
    visibility_score,
    confidence_score,
    components,
    method_version: METHOD_VERSION,
    formula:
      'Weighted average of present components (weights renormalized when data is missing): ' +
      'mention_frequency 30, competitor_gap 20, authority 15, website_signal 25, model_consensus 10. ' +
      'Recommendation visibility drives the score; website signals are supporting evidence.',
  }
}
