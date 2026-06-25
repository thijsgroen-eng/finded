/**
 * Pure helpers that assemble the tier-specific report sections (status, website
 * snapshot, prompt-category performance, action plan / roadmap). Kept I/O-free
 * and deterministic so the PDF builder stays thin and the logic is unit-testable.
 * Bilingual: pass lang ('nl' for the Dutch-first product) for display text.
 */

import { Language } from '@/lib/i18n'

export type VisibilityStatus = 'Not recommended' | 'Low visibility' | 'Moderate visibility' | 'Strong visibility'

/** Headline status from how often AI named the restaurant (canonical English key). */
export function visibilityStatus(mentionFreqPct: number, mentioned: boolean): VisibilityStatus {
  if (!mentioned || mentionFreqPct <= 0) return 'Not recommended'
  if (mentionFreqPct < 15) return 'Low visibility'
  if (mentionFreqPct < 40) return 'Moderate visibility'
  return 'Strong visibility'
}

const STATUS_NL: Record<VisibilityStatus, string> = {
  'Not recommended': 'Niet aanbevolen',
  'Low visibility': 'Lage zichtbaarheid',
  'Moderate visibility': 'Gemiddelde zichtbaarheid',
  'Strong visibility': 'Sterke zichtbaarheid',
}
/** Localized status label for display (color logic still keys off the English value). */
export function statusLabel(status: string, lang: Language): string {
  return lang === 'nl' ? (STATUS_NL[status as VisibilityStatus] ?? status) : status
}

export type SignalStrength = 'Strong' | 'Present' | 'Weak' | 'Missing'
const STRENGTH_NL: Record<SignalStrength, string> = { Strong: 'Sterk', Present: 'Aanwezig', Weak: 'Zwak', Missing: 'Ontbreekt' }
export function strengthLabel(s: string, lang: Language): string {
  return lang === 'nl' ? (STRENGTH_NL[s as SignalStrength] ?? s) : s
}

export interface SnapshotRow { label: string; strength: SignalStrength }

interface SnapshotSignal { key: string; status: 'present' | 'weak' | 'missing' }

const SNAPSHOT_LABELS: Record<Language, Record<string, string>> = {
  en: { cuisine: 'Cuisine signals', location: 'Location signals', schema: 'Schema', faq: 'FAQ content', authority: 'Authority signals' },
  nl: { cuisine: 'Keukensignalen', location: 'Locatiesignalen', schema: 'Schema', faq: 'FAQ-inhoud', authority: 'Autoriteitssignalen' },
}

/** High-level website snapshot for the FREE report (no detail). */
export function websiteSnapshot(signals: SnapshotSignal[], ownCited: boolean, lang: Language = 'en'): SnapshotRow[] {
  const L = SNAPSHOT_LABELS[lang]
  const has = (key: string): SignalStrength => {
    const s = signals.find((x) => x.key === key)
    if (!s) return 'Missing'
    return s.status === 'present' ? 'Strong' : s.status === 'weak' ? 'Weak' : 'Missing'
  }
  return [
    { label: L.cuisine, strength: has('cuisine_clarity') },
    { label: L.location, strength: has('location_clarity') },
    { label: L.schema, strength: signals.some((s) => s.key === 'restaurant_schema' && s.status === 'present') ? 'Present' : 'Missing' },
    { label: L.faq, strength: has('faq_content') },
    { label: L.authority, strength: ownCited ? 'Present' : 'Weak' },
  ]
}

interface PromptCat { category: string | null; mentioned_any: boolean }

export interface CategoryPerformance { category: string; appeared: number; total: number }

const CATEGORY_LABELS: Record<Language, Record<string, string>> = {
  en: { discovery: 'General discovery', category: 'Cuisine specific', occasions: 'Occasion & romantic', trust: 'Local discovery', geographic: 'Practical', problem: 'Tourist', problemSolution: 'Tourist', other: 'Other' },
  nl: { discovery: 'Algemene ontdekking', category: 'Keuken-specifiek', occasions: 'Gelegenheid & romantisch', trust: 'Lokale ontdekking', geographic: 'Praktisch', problem: 'Toerist', problemSolution: 'Toerist', other: 'Overig' },
}

/** Per prompt-category appearance rate (paid report). */
export function categoryPerformance(prompts: PromptCat[], lang: Language = 'en'): CategoryPerformance[] {
  const labels = CATEGORY_LABELS[lang]
  const map = new Map<string, { appeared: number; total: number }>()
  for (const p of prompts) {
    const label = labels[p.category ?? ''] ?? (p.category ?? labels.other)
    const slot = map.get(label) ?? { appeared: 0, total: 0 }
    slot.total++
    if (p.mentioned_any) slot.appeared++
    map.set(label, slot)
  }
  return [...map.entries()].map(([category, v]) => ({ category, ...v }))
}

interface RecRow { title: string; priority_rank?: string | null }
export interface PlanBucket { label: string; items: string[] }

const PLAN_TEXT = {
  en: {
    w1: 'Week 1 — quick wins', w2: 'Week 2 — core fixes', w3: 'Week 3 — strengthen signals', w4: 'Week 4 — measure',
    w4item: 'Re-run the audit to confirm visibility changes',
    immediate: 'Immediate', d30: '30 days', d60: '60 days', d90: '90 days', d90item: 'Follow-up visibility check (before / after)',
  },
  nl: {
    w1: 'Week 1 — snelle winst', w2: 'Week 2 — kernverbeteringen', w3: 'Week 3 — signalen versterken', w4: 'Week 4 — meten',
    w4item: 'Audit opnieuw draaien om zichtbaarheidsveranderingen te bevestigen',
    immediate: 'Direct', d30: '30 dagen', d60: '60 dagen', d90: '90 dagen', d90item: 'Vervolg-zichtbaarheidscheck (vóór / na)',
  },
}

/** 30-day action plan (paid): buckets by priority into weeks. */
export function actionPlanWeeks(recs: RecRow[], lang: Language = 'en'): PlanBucket[] {
  const T = PLAN_TEXT[lang]
  const byRank = (r: string) => recs.filter((x) => (x.priority_rank ?? 'do_next') === r).map((x) => x.title)
  return [
    { label: T.w1, items: byRank('do_first') },
    { label: T.w2, items: byRank('do_next') },
    { label: T.w3, items: byRank('optional') },
    { label: T.w4, items: [T.w4item] },
  ].filter((b) => b.items.length > 0)
}

/** 90-day roadmap (implementation package). */
export function roadmap90(recs: RecRow[], lang: Language = 'en'): PlanBucket[] {
  const T = PLAN_TEXT[lang]
  const byRank = (r: string) => recs.filter((x) => (x.priority_rank ?? 'do_next') === r).map((x) => x.title)
  return [
    { label: T.immediate, items: byRank('do_first') },
    { label: T.d30, items: byRank('do_next') },
    { label: T.d60, items: byRank('optional') },
    { label: T.d90, items: [T.d90item] },
  ].filter((b) => b.items.length > 0)
}
