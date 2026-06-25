/**
 * Data quality rating (High / Medium / Low) — an honest replacement for an
 * arbitrary confidence percentage. Based on how many model calls actually
 * completed, not on a formula nobody can explain. Pure + testable. Bilingual.
 */

import { Language } from '@/lib/i18n'

export type DataQualityLevel = 'High' | 'Medium' | 'Low'

export interface ProviderCompletion { model: string; completed: number; failed: number }

export interface DataQuality {
  level: DataQualityLevel
  /** Localized display label for `level` (English value kept for color/logic). */
  levelLabel: string
  completionRate: number   // 0–1
  completed: number
  total: number
  reason: string
}

const LEVEL_NL: Record<DataQualityLevel, string> = { High: 'Hoog', Medium: 'Gemiddeld', Low: 'Laag' }

const MODEL_LABELS: Record<string, string> = {
  openai: 'ChatGPT', anthropic: 'Claude', gemini: 'Gemini', perplexity: 'Perplexity',
}
const label = (m: string) => MODEL_LABELS[m] ?? m

function list(names: string[], lang: Language): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  const join = lang === 'nl' ? ' en ' : ' and '
  return `${names.slice(0, -1).join(', ')}${join}${names[names.length - 1]}`
}

export function buildDataQuality(acc: {
  total_runs: number
  completed: number
  providers: ProviderCompletion[]
}, lang: Language = 'en'): DataQuality {
  const nl = lang === 'nl'
  const total = acc.total_runs
  const completed = acc.completed
  const completionRate = total > 0 ? completed / total : 0

  const okP = acc.providers.filter((p) => p.completed > 0 && p.failed === 0).map((p) => label(p.model))
  const partialP = acc.providers.filter((p) => p.completed > 0 && p.failed > 0).map((p) => label(p.model))
  const deadP = acc.providers.filter((p) => p.completed === 0 && p.failed > 0).map((p) => label(p.model))
  const providersWithData = acc.providers.filter((p) => p.completed > 0).length

  // Thresholds aligned with the reliability gate (lib/audit/reliability.ts):
  // <50% completion is Low (= red, results withheld), 50–80% Medium (= yellow),
  // ≥80% across 2+ providers High (= green).
  let level: DataQualityLevel
  if (completionRate >= 0.8 && providersWithData >= 2) level = 'High'
  else if (completionRate >= 0.5 && providersWithData >= 1) level = 'Medium'
  else level = 'Low'

  const bits: string[] = []
  if (okP.length) bits.push(nl ? `${list(okP, lang)} voltooid` : `${list(okP, lang)} completed successfully`)
  if (partialP.length) bits.push(nl ? `${list(partialP, lang)} gedeeltelijk mislukt` : `${list(partialP, lang)} returned incomplete results`)
  if (deadP.length) bits.push(nl ? `${list(deadP, lang)} mislukt` : `${list(deadP, lang)} failed`)
  const reason = total === 0
    ? (nl ? 'Er zijn geen modelantwoorden geregistreerd.' : 'No model responses were recorded.')
    : (nl ? `${bits.join('; ')}. ${completed} van de ${total} modelaanroepen geslaagd.` : `${bits.join('; ')}. ${completed} of ${total} model calls succeeded.`)

  const levelLabel = nl ? LEVEL_NL[level] : level
  return { level, levelLabel, completionRate, completed, total, reason }
}
