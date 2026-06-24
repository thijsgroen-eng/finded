/**
 * Recommendation prioritisation: turn Impact × Effort into a clear "where to
 * start" rank so a restaurant owner knows the order to act in. Pure + testable.
 */

export type Level = 'low' | 'medium' | 'high'
export type PriorityRank = 'do_first' | 'do_next' | 'optional'

export function asLevel(v: unknown): Level {
  return v === 'high' || v === 'medium' || v === 'low' ? v : 'medium'
}

/**
 * Impact × Effort → rank:
 *  - High impact, not-high effort  → do_first  (biggest, cheapest wins)
 *  - Low impact (any effort)       → optional
 *  - Medium impact + high effort   → optional
 *  - everything else               → do_next
 */
export function computePriorityRank(impact: Level, effort: Level): PriorityRank {
  if (impact === 'high' && effort !== 'high') return 'do_first'
  if (impact === 'low') return 'optional'
  if (impact === 'medium' && effort === 'high') return 'optional'
  return 'do_next'
}

export const PRIORITY_RANK_ORDER: PriorityRank[] = ['do_first', 'do_next', 'optional']

export const PRIORITY_RANK_LABEL: Record<PriorityRank, string> = {
  do_first: 'Do first',
  do_next: 'Do next',
  optional: 'Optional',
}

/** Sort key so do_first < do_next < optional (lower = earlier). */
export function priorityRankOrder(rank: PriorityRank): number {
  return PRIORITY_RANK_ORDER.indexOf(rank)
}
