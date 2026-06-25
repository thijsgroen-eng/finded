/**
 * Data quality rating (High / Medium / Low) — an honest replacement for an
 * arbitrary confidence percentage. Based on how many model calls actually
 * completed, not on a formula nobody can explain. Pure + testable.
 */

export type DataQualityLevel = 'High' | 'Medium' | 'Low'

export interface ProviderCompletion { model: string; completed: number; failed: number }

export interface DataQuality {
  level: DataQualityLevel
  completionRate: number   // 0–1
  completed: number
  total: number
  reason: string
}

const MODEL_LABELS: Record<string, string> = {
  openai: 'ChatGPT', anthropic: 'Claude', gemini: 'Gemini', perplexity: 'Perplexity',
}
const label = (m: string) => MODEL_LABELS[m] ?? m

function list(names: string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export function buildDataQuality(acc: {
  total_runs: number
  completed: number
  providers: ProviderCompletion[]
}): DataQuality {
  const total = acc.total_runs
  const completed = acc.completed
  const completionRate = total > 0 ? completed / total : 0

  const okProviders = acc.providers.filter((p) => p.completed > 0 && p.failed === 0).map((p) => label(p.model))
  const partialProviders = acc.providers.filter((p) => p.completed > 0 && p.failed > 0).map((p) => label(p.model))
  const deadProviders = acc.providers.filter((p) => p.completed === 0 && p.failed > 0).map((p) => label(p.model))
  const providersWithData = acc.providers.filter((p) => p.completed > 0).length

  let level: DataQualityLevel
  if (completionRate >= 0.8 && providersWithData >= 2) level = 'High'
  else if (completionRate >= 0.4 && providersWithData >= 1) level = 'Medium'
  else level = 'Low'

  const bits: string[] = []
  if (okProviders.length) bits.push(`${list(okProviders)} completed successfully`)
  if (partialProviders.length) bits.push(`${list(partialProviders)} returned incomplete results`)
  if (deadProviders.length) bits.push(`${list(deadProviders)} failed`)
  const reason = total === 0
    ? 'No model responses were recorded.'
    : `${bits.join('; ')}. ${completed} of ${total} model calls succeeded.`

  return { level, completionRate, completed, total, reason }
}
