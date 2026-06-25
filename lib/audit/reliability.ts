/**
 * Reliability assessment — the single source of truth for whether an audit ran
 * on enough successful model calls to be trustworthy. Pure + deterministic so it
 * can gate the pipeline AND drive the UI/PDF warnings from the same numbers.
 *
 * Bands (by share of model calls that completed):
 *   green   ≥ 80%  → full-confidence results
 *   yellow  50–80% → results shown WITH a warning + reduced confidence
 *   red    < 50%   → NOT enough data: no score / recommendations / conclusions.
 *                    The audit is marked 'incomplete' and a rerun is requested.
 *
 * An audit with zero successful calls, or where every successful call came from a
 * single provider, is never green (cross-model consensus is part of the point).
 */

export type ReliabilityBand = 'green' | 'yellow' | 'red'

export const RELIABILITY_THRESHOLDS = { green: 0.8, yellow: 0.5 } as const

const MODEL_LABELS: Record<string, string> = {
  openai: 'ChatGPT', anthropic: 'Claude', gemini: 'Gemini', perplexity: 'Perplexity',
}
const label = (m: string) => MODEL_LABELS[m] ?? m

function list(names: string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export interface ProviderRuns { model: string; completed: number; failed: number }

export interface ReliabilityInput {
  /** Total model calls attempted (completed + failed). */
  total: number
  /** Calls that returned a usable response. */
  completed: number
  /** Per-provider completed/failed counts. */
  providers: ProviderRuns[]
}

export interface Reliability {
  band: ReliabilityBand
  completionRate: number          // 0–1
  completed: number
  failed: number
  total: number
  providersWithData: number       // distinct providers with ≥1 completed call
  okProviders: string[]           // labels: completed>0, failed==0
  partialProviders: string[]      // labels: completed>0, failed>0
  deadProviders: string[]         // labels: completed==0, failed>0
  /** Multiply a confidence score by this to reflect missing data (green 1, yellow 0.6, red 0). */
  confidenceMultiplier: number
  /** What the pipeline / routes are allowed to produce at this band. */
  allow: { score: boolean; recommendations: boolean; conclusions: boolean }
  /** Short status line, e.g. "33% of model calls succeeded — not enough to report". */
  headline: string
  /** Full explanation including which providers failed. */
  detail: string
}

export function assessReliability(input: ReliabilityInput): Reliability {
  const total = input.total
  const completed = input.completed
  const failed = Math.max(0, total - completed)
  const completionRate = total > 0 ? completed / total : 0

  const okProviders = input.providers.filter((p) => p.completed > 0 && p.failed === 0).map((p) => label(p.model))
  const partialProviders = input.providers.filter((p) => p.completed > 0 && p.failed > 0).map((p) => label(p.model))
  const deadProviders = input.providers.filter((p) => p.completed === 0 && p.failed > 0).map((p) => label(p.model))
  const providersWithData = input.providers.filter((p) => p.completed > 0).length

  let band: ReliabilityBand
  if (completionRate < RELIABILITY_THRESHOLDS.yellow || providersWithData === 0) band = 'red'
  else if (completionRate < RELIABILITY_THRESHOLDS.green || providersWithData < 2) band = 'yellow'
  else band = 'green'

  const confidenceMultiplier = band === 'green' ? 1 : band === 'yellow' ? 0.6 : 0
  const allow = {
    score: band !== 'red',
    recommendations: band !== 'red',
    conclusions: band !== 'red',
  }

  const pct = Math.round(completionRate * 100)
  const headline =
    band === 'red' ? `Only ${pct}% of AI model calls succeeded — not enough data to report reliably`
    : band === 'yellow' ? `${pct}% of AI model calls succeeded — results shown with reduced confidence`
    : `${pct}% of AI model calls succeeded`

  const bits: string[] = []
  if (okProviders.length) bits.push(`${list(okProviders)} completed`)
  if (partialProviders.length) bits.push(`${list(partialProviders)} partially failed`)
  if (deadProviders.length) bits.push(`${list(deadProviders)} failed entirely`)
  const detail = total === 0
    ? 'No model calls were recorded for this audit.'
    : `${completed} of ${total} model calls succeeded (${pct}%). ${bits.join('; ')}.`

  return {
    band, completionRate, completed, failed, total, providersWithData,
    okProviders, partialProviders, deadProviders,
    confidenceMultiplier, allow, headline, detail,
  }
}

/** Convenience: build the input from a RunAccounting-style object. */
export function reliabilityFromAccounting(acc: {
  total_runs: number
  completed: number
  providers: { model: string; completed: number; failed: number }[]
}): Reliability {
  return assessReliability({
    total: acc.total_runs,
    completed: acc.completed,
    providers: acc.providers.map((p) => ({ model: p.model, completed: p.completed, failed: p.failed })),
  })
}
