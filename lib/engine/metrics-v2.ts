import { ExtractedEntity } from './entity-extractor'
import { positionWeight } from './metrics-core'

export interface CompetitorStats {
  name: string
  mention_count: number
  avg_position: number
  sentiment_score: number    // -1 to 1
  share_of_voice: number     // 0-1
  top_reasons: string[]
}

export interface VisibilityMetricsV2 {
  visibility_score: number
  opportunity_score: number
  mention_frequency: number
  prompt_coverage: number
  avg_position: number | null
  median_position: number | null
  best_position: number | null
  worst_position: number | null
  position_score: number
  model_consensus: number
  model_breakdown: {
    model: string
    frequency: number
    avg_position: number | null
    mentions: number
  }[]
  share_of_voice: number
  total_market_mentions: number
  sentiment_score: number
  sentiment_breakdown: {
    positive: number
    neutral: number
    negative: number
  }
  competitors: CompetitorStats[]
  top_reasons: string[]
  visibility_gap: number
  recommendation_gap: number
  opportunity_label: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY HIGH'
  estimated_additional_visitors_min: number
  estimated_additional_visitors_max: number
  estimated_revenue_min: number
  estimated_revenue_max: number
  total_mentions: number
  total_prompts: number
  total_model_runs: number
}

interface MentionData {
  model: string
  prompt_id: string
  mentioned: boolean
  position: number | null
  sentiment: string | null
}

interface EntityData {
  name: string
  position: number
  sentiment: string
  reasons: string[]
  model: string
  prompt_id: string
}

export function computeVisibilityScore(
  mentionFrequency: number,
  positionScore: number,
  promptCoverage: number,
  modelConsensus: number
): number {
  const score =
    mentionFrequency * 35 +
    (positionScore / 100) * 25 +
    promptCoverage * 20 +
    (modelConsensus / 4) * 20

  return Math.min(100, Math.round(score))  // ← was Math.round(score * 100)
}

export function computeOpportunityScore(
  myMentions: number,
  topCompetitorMentions: number,
  shareOfVoice: number,
  modelConsensus: number,
  totalPrompts: number
): { score: number; label: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY HIGH' } {
  if (totalPrompts === 0) return { score: 0, label: 'LOW' }

  const competitorRatio = topCompetitorMentions > 0
    ? topCompetitorMentions / Math.max(myMentions, 1)
    : 1

  const gapScore = Math.min(60, Math.round((competitorRatio - 1) * 15))
  const sovScore = Math.min(25, Math.round(Math.max(0, 0.30 - shareOfVoice) * 100))
  const modelGapScore = Math.round((4 - modelConsensus) / 4 * 15)

  const score = Math.min(100, gapScore + sovScore + modelGapScore)

  const label =
    score >= 75 ? 'VERY HIGH' :
    score >= 50 ? 'HIGH' :
    score >= 25 ? 'MEDIUM' : 'LOW'

  return { score, label }
}

export function computeFullMetrics(
  targetName: string,
  mentions: MentionData[],
  allEntities: EntityData[]
): VisibilityMetricsV2 {
  const targetMentions = mentions.filter(m => m.mentioned)
  const totalPrompts = new Set(mentions.map(m => m.prompt_id)).size
  const totalMentions = targetMentions.length

  const promptsWithMention = new Set(targetMentions.map(m => m.prompt_id)).size
  const promptCoverage = totalPrompts > 0 ? promptsWithMention / totalPrompts : 0
  const mentionFrequency = totalPrompts > 0 ? Math.min(1, totalMentions / totalPrompts) : 0

  const positions = targetMentions
    .filter(m => m.position !== null)
    .map(m => m.position!)
    .sort((a, b) => a - b)

  const avgPosition = positions.length > 0
    ? positions.reduce((a, b) => a + b, 0) / positions.length
    : null
  const medianPosition = positions.length > 0
    ? positions[Math.floor(positions.length / 2)]
    : null
  const bestPosition = positions.length > 0 ? Math.min(...positions) : null
  const worstPosition = positions.length > 0 ? Math.max(...positions) : null

  const positionScores = positions.map(p => positionWeight(p))
  const positionScore = positionScores.length > 0
    ? positionScores.reduce((a, b) => a + b, 0) / positionScores.length
    : 0

  const models = ['openai', 'anthropic', 'gemini', 'perplexity']
  const modelBreakdown = models.map(model => {
    const modelRows = mentions.filter(m => m.model === model)
    const modelMentions = modelRows.filter(m => m.mentioned)
    const modelPrompts = new Set(modelRows.map(m => m.prompt_id)).size
    const modelPositions = modelMentions
      .filter(m => m.position !== null)
      .map(m => m.position!)
    return {
      model,
      frequency: modelPrompts > 0 ? Math.min(1, modelMentions.length / modelPrompts) : 0,
      avg_position: modelPositions.length > 0
        ? modelPositions.reduce((a, b) => a + b, 0) / modelPositions.length
        : null,
      mentions: modelMentions.length,
    }
  })
  const modelConsensus = modelBreakdown.filter(m => m.mentions > 0).length

  const visibility_score = computeVisibilityScore(
    mentionFrequency, positionScore, promptCoverage, modelConsensus
  )

  const sentimentValues: number[] = targetMentions.map(m => {
    if (m.sentiment === 'positive') return 1
    if (m.sentiment === 'negative') return -1
    return 0
  })
  const sentiment_score = sentimentValues.length > 0
    ? sentimentValues.reduce((a, b) => a + b, 0) / sentimentValues.length
    : 0
  const sentiment_breakdown = {
    positive: targetMentions.filter(m => m.sentiment === 'positive').length,
    neutral:  targetMentions.filter(m => m.sentiment === 'neutral').length,
    negative: targetMentions.filter(m => m.sentiment === 'negative').length,
  }

  const competitorMap = new Map<string, {
    count: number
    positions: number[]
    sentiments: number[]
    reasons: string[]
  }>()

  for (const entity of allEntities) {
    if (entity.name.toLowerCase().includes(targetName.toLowerCase()) ||
        targetName.toLowerCase().includes(entity.name.toLowerCase())) continue

    if (!competitorMap.has(entity.name)) {
      competitorMap.set(entity.name, { count: 0, positions: [], sentiments: [], reasons: [] })
    }
    const comp = competitorMap.get(entity.name)!
    comp.count++
    if (entity.position) comp.positions.push(entity.position)
    if (entity.sentiment === 'positive') comp.sentiments.push(1)
    else if (entity.sentiment === 'negative') comp.sentiments.push(-1)
    else comp.sentiments.push(0)
    comp.reasons.push(...entity.reasons)
  }

  const total_market_mentions = totalMentions +
    [...competitorMap.values()].reduce((sum, c) => sum + c.count, 0)

  const share_of_voice = total_market_mentions > 0
    ? totalMentions / total_market_mentions
    : 0

  const competitors: CompetitorStats[] = [...competitorMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([name, data]) => ({
      name,
      mention_count: data.count,
      avg_position: data.positions.length > 0
        ? data.positions.reduce((a, b) => a + b, 0) / data.positions.length
        : 0,
      sentiment_score: data.sentiments.length > 0
        ? data.sentiments.reduce((a, b) => a + b, 0) / data.sentiments.length
        : 0,
      share_of_voice: total_market_mentions > 0 ? data.count / total_market_mentions : 0,
      top_reasons: [...new Set(data.reasons)].slice(0, 5),
    }))

  const targetEntityData = allEntities.filter(e =>
    e.name.toLowerCase().includes(targetName.toLowerCase()) ||
    targetName.toLowerCase().includes(e.name.toLowerCase())
  )
  const reasonCounts = new Map<string, number>()
  for (const entity of targetEntityData) {
    for (const reason of entity.reasons) {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1)
    }
  }
  const top_reasons = [...reasonCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([r]) => r)

  const topCompetitorMentions = competitors[0]?.mention_count ?? 0
  const { score: opportunityScore, label: opportunity_label } = computeOpportunityScore(
    totalMentions,
    topCompetitorMentions,
    share_of_voice,
    modelConsensus,
    totalPrompts
  )

  const competitorAvgMentions = competitors.length > 0
    ? competitors.slice(0, 5).reduce((sum, c) => sum + c.mention_count, 0) / Math.min(5, competitors.length)
    : totalMentions
  const visibility_gap = Math.max(0, competitorAvgMentions - totalMentions)
  const recommendation_gap = Math.max(0, topCompetitorMentions - totalMentions)

  const mentionGap = recommendation_gap
  const estimated_additional_visitors_min = Math.max(0, Math.round(mentionGap * 8))
  const estimated_additional_visitors_max = Math.max(0, Math.round(mentionGap * 25))
  const avgSpend = 45
  const conversionRate = 0.20
  const estimated_revenue_min = Math.round(estimated_additional_visitors_min * conversionRate * avgSpend / 100) * 100
  const estimated_revenue_max = Math.round(estimated_additional_visitors_max * conversionRate * avgSpend / 100) * 100

  return {
    visibility_score,
    opportunity_score: opportunityScore,
    mention_frequency: mentionFrequency,
    prompt_coverage: promptCoverage,
    avg_position: avgPosition,
    median_position: medianPosition,
    best_position: bestPosition,
    worst_position: worstPosition,
    position_score: positionScore,
    model_consensus: modelConsensus,
    model_breakdown: modelBreakdown,
    share_of_voice,
    total_market_mentions,
    sentiment_score,
    sentiment_breakdown,
    competitors,
    top_reasons,
    visibility_gap,
    recommendation_gap,
    opportunity_label,
    estimated_additional_visitors_min,
    estimated_additional_visitors_max,
    estimated_revenue_min,
    estimated_revenue_max,
    total_mentions: totalMentions,
    total_prompts: totalPrompts,
    total_model_runs: mentions.length,
  }
}
