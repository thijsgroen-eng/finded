import { ModelBreakdown, ModelName, VisibilityMetrics } from '@/types/database'
import { positionWeight, gradedMentionFrequency } from './metrics-core'

// NOTE: as of the N-sampling change, a `mentions` row's `mentioned` boolean is a
// MAJORITY threshold over sampled runs (>= 0.5); the graded value is
// `mention_frequency`. mention_frequency below uses the graded value (shared with
// metrics-v2.ts) so the report page matches the dashboard, but position/sentiment
// and counts still derive from the majority `mentioned` flag.
export interface MentionRow {
  model: ModelName
  prompt_id: string
  mentioned: boolean
  mention_frequency?: number | null
  position: number | null
  sentiment: string | null
}

export interface ComputedMetrics {
  mention_frequency: number      // 0–1
  position_score: number         // 0–100 weighted average
  model_consensus: number        // 0–4
  model_breakdown: ModelBreakdown[]
  total_mentions: number
  total_prompts: number
  sentiment_breakdown: {
    positive: number
    neutral: number
    negative: number
  }
}

/**
 * Compute all visibility metrics from a flat array of mention rows.
 * This is pure computation — no DB calls.
 */
export function computeMetrics(mentions: MentionRow[]): ComputedMetrics {
  if (!mentions.length) {
    return {
      mention_frequency: 0,
      position_score: 0,
      model_consensus: 0,
      model_breakdown: [],
      total_mentions: 0,
      total_prompts: 0,
      sentiment_breakdown: { positive: 0, neutral: 0, negative: 0 },
    }
  }

  const allMentions = mentions.filter((m) => m.mentioned)
  const totalPrompts = new Set(mentions.map((m) => m.prompt_id)).size
  const totalMentions = allMentions.length

  // Mention frequency — graded, shared with metrics-v2.ts (see metrics-core.ts).
  const mention_frequency = gradedMentionFrequency(mentions)

  // Position score — weighted average over all mentioned rows
  const positionScores = allMentions
    .filter((m) => m.position !== null)
    .map((m) => positionWeight(m.position!))

  const position_score =
    positionScores.length > 0
      ? positionScores.reduce((a, b) => a + b, 0) / positionScores.length
      : 0

  // Model consensus — distinct models that mentioned at least once
  const mentioningModels = new Set(allMentions.map((m) => m.model))
  const model_consensus = mentioningModels.size

  // Per-model breakdown
  const models: ModelName[] = ['openai', 'anthropic', 'gemini', 'perplexity']
  const model_breakdown: ModelBreakdown[] = models.map((model) => {
    const modelRows = mentions.filter((m) => m.model === model)
    const modelMentions = modelRows.filter((m) => m.mentioned)
    const positions = modelMentions
      .filter((m) => m.position !== null)
      .map((m) => m.position!)

    return {
      model,
      mentions: modelMentions.length,
      total_prompts: new Set(modelRows.map((m) => m.prompt_id)).size,
      frequency:
        modelRows.length > 0 ? Math.min(1, modelMentions.length / new Set(modelRows.map((m) => m.prompt_id)).size) : 0,
      avg_position:
        positions.length > 0
          ? positions.reduce((a, b) => a + b, 0) / positions.length
          : null,
    }
  })

  // Sentiment breakdown
  const sentiment_breakdown = {
    positive: allMentions.filter((m) => m.sentiment === 'positive').length,
    neutral:  allMentions.filter((m) => m.sentiment === 'neutral').length,
    negative: allMentions.filter((m) => m.sentiment === 'negative').length,
  }

  return {
    mention_frequency,
    position_score,
    model_consensus,
    model_breakdown,
    total_mentions: totalMentions,
    total_prompts: totalPrompts,
    sentiment_breakdown,
  }
}

/**
 * Compute share of voice within a cohort.
 * cohort: array of { restaurant_id, total_mentions }
 * Returns map of restaurant_id → share_of_voice (0–1)
 */
export function computeShareOfVoice(
  cohort: Array<{ restaurant_id: string; total_mentions: number }>
): Map<string, number> {
  const total = cohort.reduce((sum, r) => sum + r.total_mentions, 0)
  const map = new Map<string, number>()
  for (const r of cohort) {
    map.set(r.restaurant_id, total > 0 ? r.total_mentions / total : 0)
  }
  return map
}
