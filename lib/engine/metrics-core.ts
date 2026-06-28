/**
 * Canonical metric primitives shared by every metrics computation.
 *
 * Both the read-time metrics (lib/engine/metrics.ts, used by the report page and
 * several API routes) and the audit-time metrics (lib/engine/metrics-v2.ts, which
 * persists visibility_scores) import from here, so a restaurant's position score
 * is identical no matter which path produced it.
 */

// Weight applied to a mention by its rank in the model's answer. Higher rank =
// more visible. Positions beyond the table fall back to POSITION_WEIGHT_DEFAULT.
export const POSITION_WEIGHTS: Record<number, number> = {
  1: 100,
  2: 85,
  3: 70,
  4: 55,
  5: 40,
}
export const POSITION_WEIGHT_DEFAULT = 20

export function positionWeight(position: number): number {
  return POSITION_WEIGHTS[position] ?? POSITION_WEIGHT_DEFAULT
}

/** Weighted average position score (0–100) over a set of ranked positions. */
export function weightedPositionScore(positions: number[]): number {
  if (positions.length === 0) return 0
  const sum = positions.reduce((acc, p) => acc + positionWeight(p), 0)
  return sum / positions.length
}

/**
 * Graded mention frequency (0–1): the mean per-(model,prompt) sample frequency.
 * Falls back to the binary `mentioned` flag for rows without a recorded
 * frequency. Shared by the read-time (metrics.ts) and audit-time (metrics-v2.ts)
 * paths so the report page and the dashboard report the same number.
 */
export function gradedMentionFrequency(
  rows: Array<{ mentioned: boolean; mention_frequency?: number | null }>
): number {
  if (rows.length === 0) return 0
  const sum = rows.reduce((acc, r) => acc + (r.mention_frequency ?? (r.mentioned ? 1 : 0)), 0)
  return Math.min(1, sum / rows.length)
}

export const AUDIT_MODELS = ['openai', 'anthropic', 'gemini', 'perplexity'] as const

export interface ModelBreakdownRow {
  model: string
  mentions: number
  total_prompts: number
  /** mentions / distinct prompts for this model, clamped to 1. */
  frequency: number
  avg_position: number | null
}

/**
 * Per-model breakdown — shared by the read-time (metrics.ts) and audit-time
 * (metrics-v2.ts) paths so both report identical per-model figures.
 */
export function computeModelBreakdown(
  rows: Array<{ model: string; prompt_id: string; mentioned: boolean; position: number | null }>,
  models: readonly string[] = AUDIT_MODELS,
): ModelBreakdownRow[] {
  return models.map((model) => {
    const modelRows = rows.filter((m) => m.model === model)
    const modelMentions = modelRows.filter((m) => m.mentioned)
    const distinctPrompts = new Set(modelRows.map((m) => m.prompt_id)).size
    const positions = modelMentions.filter((m) => m.position !== null).map((m) => m.position as number)
    return {
      model,
      mentions: modelMentions.length,
      total_prompts: distinctPrompts,
      frequency: distinctPrompts > 0 ? Math.min(1, modelMentions.length / distinctPrompts) : 0,
      avg_position: positions.length > 0 ? positions.reduce((a, b) => a + b, 0) / positions.length : null,
    }
  })
}

/** Counts of positive/neutral/negative over a set of (mentioned) rows. */
export function computeSentimentBreakdown(
  rows: Array<{ sentiment: string | null }>
): { positive: number; neutral: number; negative: number } {
  return {
    positive: rows.filter((m) => m.sentiment === 'positive').length,
    neutral:  rows.filter((m) => m.sentiment === 'neutral').length,
    negative: rows.filter((m) => m.sentiment === 'negative').length,
  }
}
