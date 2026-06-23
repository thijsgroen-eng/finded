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

export const METHOD_VERSION = 'v1'

export interface ScoreInputs {
  /** Fraction of sampled answers that mentioned the target (0–1). */
  mentionFrequency: number | null
  /** Average rank when mentioned (1 = first). null = never mentioned / unknown. */
  avgPosition: number | null
  /** Distinct models that mentioned the target. */
  modelConsensus: number | null
  /** How many providers actually ran (consensus denominator; >=1). */
  providersRan: number
  /** Fraction of distinct prompts with at least one mention (0–1). */
  promptCoverage: number | null
  /** Target's share of all mentions in its market (0–1). null if no competitor data. */
  shareOfVoice: number | null
  /** Website AI-readiness: how many key signals are present out of those checked. */
  websiteSignals: { present: number; total: number } | null
  /** Total sampled (model × prompt × sample) cells behind the audit. */
  sampleCount: number
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
const WEIGHTS = {
  mention_frequency_score: 0.30,
  average_position_score: 0.20,
  competitor_gap_score: 0.15,
  model_consensus_score: 0.15,
  prompt_coverage_score: 0.10,
  website_signal_score: 0.10,
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

  // average_position_score
  raw.push({
    key: 'average_position_score', label: 'Average position', weight: WEIGHTS.average_position_score,
    present: input.avgPosition != null,
    score: input.avgPosition != null ? positionScoreFromAvg(input.avgPosition) : 0,
    detail: input.avgPosition != null
      ? `Average rank ${input.avgPosition.toFixed(1)} when mentioned.`
      : 'Not mentioned, so no position.',
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

  // prompt_coverage_score
  raw.push({
    key: 'prompt_coverage_score', label: 'Prompt coverage', weight: WEIGHTS.prompt_coverage_score,
    present: input.promptCoverage != null,
    score: input.promptCoverage != null ? clamp(input.promptCoverage * 100) : 0,
    detail: input.promptCoverage != null
      ? `Appeared for ${Math.round(input.promptCoverage * 100)}% of distinct prompts.`
      : 'No prompt data.',
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
  // (saturating at 24 sampled answers). Deterministic, 0–1.
  const completeness = present.length / raw.length
  const sampleFactor = Math.min(1, input.sampleCount / 24)
  const confidence_score = round((0.5 * completeness + 0.5 * sampleFactor))

  return {
    visibility_score,
    confidence_score,
    components,
    method_version: METHOD_VERSION,
    formula:
      'Weighted average of present components (weights renormalized when data is missing): ' +
      'mention_frequency 30, average_position 20, competitor_gap 15, model_consensus 15, ' +
      'prompt_coverage 10, website_signal 10. Confidence = 50% evidence completeness + 50% sample size (saturates at 24).',
  }
}
