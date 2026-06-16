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
