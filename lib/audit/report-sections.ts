/**
 * Pure helpers that assemble the tier-specific report sections (status, website
 * snapshot, prompt-category performance, action plan / roadmap). Kept I/O-free
 * and deterministic so the PDF builder stays thin and the logic is unit-testable.
 */

export type VisibilityStatus = 'Not recommended' | 'Low visibility' | 'Moderate visibility' | 'Strong visibility'

/** Headline status from how often AI named the restaurant. */
export function visibilityStatus(mentionFreqPct: number, mentioned: boolean): VisibilityStatus {
  if (!mentioned || mentionFreqPct <= 0) return 'Not recommended'
  if (mentionFreqPct < 15) return 'Low visibility'
  if (mentionFreqPct < 40) return 'Moderate visibility'
  return 'Strong visibility'
}

export type SignalStrength = 'Strong' | 'Present' | 'Weak' | 'Missing'

export interface SnapshotRow { label: string; strength: SignalStrength }

interface SnapshotSignal { key: string; status: 'present' | 'weak' | 'missing' }

/** High-level website snapshot for the FREE report (no detail). */
export function websiteSnapshot(signals: SnapshotSignal[], ownCited: boolean): SnapshotRow[] {
  const has = (key: string): SignalStrength => {
    const s = signals.find((x) => x.key === key)
    if (!s) return 'Missing'
    return s.status === 'present' ? 'Strong' : s.status === 'weak' ? 'Weak' : 'Missing'
  }
  return [
    { label: 'Cuisine signals', strength: has('cuisine_clarity') },
    { label: 'Location signals', strength: has('location_clarity') },
    { label: 'Schema', strength: signals.some((s) => s.key === 'restaurant_schema' && s.status === 'present') ? 'Present' : 'Missing' },
    { label: 'FAQ content', strength: has('faq_content') },
    { label: 'Authority signals', strength: ownCited ? 'Present' : 'Weak' },
  ]
}

interface PromptCat { category: string | null; mentioned_any: boolean }

export interface CategoryPerformance { category: string; appeared: number; total: number }

const CATEGORY_LABELS: Record<string, string> = {
  discovery: 'General discovery',
  category: 'Cuisine specific',
  occasions: 'Occasion & romantic',
  trust: 'Local discovery',
  geographic: 'Practical',
  problem: 'Tourist',
  problemSolution: 'Tourist',
}

/** Per prompt-category appearance rate (paid report). */
export function categoryPerformance(prompts: PromptCat[]): CategoryPerformance[] {
  const map = new Map<string, { appeared: number; total: number }>()
  for (const p of prompts) {
    const label = CATEGORY_LABELS[p.category ?? ''] ?? (p.category ?? 'Other')
    const slot = map.get(label) ?? { appeared: 0, total: 0 }
    slot.total++
    if (p.mentioned_any) slot.appeared++
    map.set(label, slot)
  }
  return [...map.entries()].map(([category, v]) => ({ category, ...v }))
}

interface RecRow { title: string; priority_rank?: string | null }
export interface PlanBucket { label: string; items: string[] }

/** 30-day action plan (paid): buckets by priority into weeks. */
export function actionPlanWeeks(recs: RecRow[]): PlanBucket[] {
  const byRank = (r: string) => recs.filter((x) => (x.priority_rank ?? 'do_next') === r).map((x) => x.title)
  return [
    { label: 'Week 1 — quick wins', items: byRank('do_first') },
    { label: 'Week 2 — core fixes', items: byRank('do_next') },
    { label: 'Week 3 — strengthen signals', items: byRank('optional') },
    { label: 'Week 4 — measure', items: ['Re-run the audit to confirm visibility changes'] },
  ].filter((b) => b.items.length > 0)
}

/** 90-day roadmap (implementation package). */
export function roadmap90(recs: RecRow[]): PlanBucket[] {
  const byRank = (r: string) => recs.filter((x) => (x.priority_rank ?? 'do_next') === r).map((x) => x.title)
  return [
    { label: 'Immediate', items: byRank('do_first') },
    { label: '30 days', items: byRank('do_next') },
    { label: '60 days', items: byRank('optional') },
    { label: '90 days', items: ['Follow-up visibility check (before / after)'] },
  ].filter((b) => b.items.length > 0)
}
