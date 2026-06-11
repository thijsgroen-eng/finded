import { ExtractedEntity } from './entity-extractor'

export interface CompetitorStats {
  name: string
  mention_count: number
  avg_position: number
  sentiment_score: number    // -1 to 1
  share_of_voice: number     // 0-1
  top_reasons: string[]
}

export interface VisibilityMetricsV2 {
  // Core scores
  visibility_score: number          // 0-100
  opportunity_score: number         // 0-100
  
  // Frequency
  mention_frequency: number         // 0-1
  prompt_coverage: number           // 0-1 (prompts where mentioned / total prompts)
  
  // Position
  avg_position: number | null
  median_position: number | null
  best_position: number | null
  worst_position: number | null
  position_score: number            // 0-100 weighted
  
  // Consensus
  model_consensus: number           // 0-4
  model_breakdown: {
    model: string
    frequency: number
    avg_position: number | null
    mentions: number
  }[]
  
  // Share of voice
  share_of_voice: number            // 0-1
  total_market_mentions: number
  
  // Sentiment
  sentiment_score: number           // -1 to 1
  sentiment_breakdown: {
    positive: number
    neutral: number
    negative: number
  }
  
  // Competitors
  competitors: CompetitorStats[]
  
  // Recommendation reasons
  top_reasons: string[]
  
  // Opportunity
  visibility_gap: number            // vs competitor avg
  recommendation_gap: number
  opportunity_label: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY HIGH'
  
  // Traffic/revenue estimates
  estimated_additional_visitors_min: number
  estimated_additional_visitors_max: number
  estimated_revenue_min: number
  estimated_revenue_max: number
  
  // Totals
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

const POSITION_WEIGHTS: Record<number, number> = { 1: 100, 2: 85, 3: 70, 4: 55, 5: 40 }
const POSITION_DEFAULT = 20

export function computeVisibilityScore(
  mentionFrequency: number,
  positionScore: number,
  promptCoverage: number,
  modelConsensus: number
): number {
  // Weighted formula
  const score =
    mentionFrequency * 35 +      // 35% weight
    (positionScore / 100) * 25 + // 25% weight
    promptCoverage * 20 +        // 20% weight
    (modelConsensus / 4) * 20    // 20% weight

  return Math.min(100, Math.round(score * 100))
}

export function computeOpportunityScore(
  visibilityScore: number,
  competitorAvgVisibility: number,
  shareOfVoice: number
): { score: number; label: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY HIGH' } {
  const gap = Math.max(0, competitorAvgVisibility - visibilityScore)
  const sovGap = Math.max(0, 0.25 - shareOfVoice) // Expected 25% SOV

  const score = Math.min(100, Math.round(gap * 0.7 + sovGap * 100 * 0.3))

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

  // Prompt coverage — unique prompts where mentioned
  const promptsWithMention = new Set(targetMentions.map(m => m.prompt_id)).size
  const promptCoverage = totalPrompts > 0 ? promptsWithMention / totalPrompts : 0
  const mentionFrequency = totalPrompts > 0 ? Math.min(1, totalMentions / totalPrompts) : 0

  // Position analysis
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

  const positionScores = positions.map(p => POSITION_WEIGHTS[p] ?? POSITION_DEFAULT)
  const positionScore = positionScores.length > 0
    ? positionScores.reduce((a, b) => a + b, 0) / positionScores.length
    : 0

  // Model consensus
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

  // Visibility score
  const visibility_score = computeVisibilityScore(
    mentionFrequency, positionScore, promptCoverage, modelConsensus
  )

  // Sentiment
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

  // Competitor analysis from entity data
  const competitorMap = new Map<string, {
    count: number
    positions: number[]
    sentiments: number[]
    reasons: string[]
  }>()

  for (const entity of allEntities) {
    // Skip target business
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

  // Total market mentions (target + competitors)
  const total_market_mentions = totalMentions +
    [...competitorMap.values()].reduce((sum, c) => sum + c.count, 0)

  const share_of_voice = total_market_mentions > 0
    ? totalMentions / total_market_mentions
    : 0

  // Top 10 competitors by mention count
  const competitors: CompetitorStats[] = [...competitorMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([name, data]) => {
      const totalMentionInMarket = total_market_mentions
      return {
        name,
        mention_count: data.count,
        avg_position: data.positions.length > 0
          ? data.positions.reduce((a, b) => a + b, 0) / data.positions.length
          : 0,
        sentiment_score: data.sentiments.length > 0
          ? data.sentiments.reduce((a, b) => a + b, 0) / data.sentiments.length
          : 0,
        share_of_voice: totalMentionInMarket > 0 ? data.count / totalMentionInMarket : 0,
        top_reasons: [...new Set(data.reasons)].slice(0, 5),
      }
    })

  // Recommendation reasons for target business
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

  // Competitor average visibility (simplified)
  const competitorAvgVisibility = competitors.length > 0
    ? competitors.slice(0, 5).reduce((sum, c) => {
        const cv = computeVisibilityScore(
          Math.min(1, c.mention_count / Math.max(1, totalPrompts)),
          50, 0.5, 2
        )
        return sum + cv
      }, 0) / Math.min(5, competitors.length)
    : 50

  // Opportunity
  const { score: opportunityScore, label: opportunity_label } =
    computeOpportunityScore(visibility_score, competitorAvgVisibility, share_of_voice)

  const visibility_gap = Math.max(0, competitorAvgVisibility - visibility_score)
  const recommendation_gap = Math.max(0,
    (competitors[0]?.mention_count ?? 0) - totalMentions
  )

  // Traffic/revenue estimates (ranges only, never precise)
  const baseVisitors = Math.round(visibility_gap * 2)
  const estimated_additional_visitors_min = Math.max(0, baseVisitors * 10)
  const estimated_additional_visitors_max = Math.max(0, baseVisitors * 30)
  const avgSpend = 45 // €45 average restaurant spend
  const conversionRate = 0.15
  const estimated_revenue_min = Math.round(
    estimated_additional_visitors_min * conversionRate * avgSpend / 100
  ) * 100
  const estimated_revenue_max = Math.round(
    estimated_additional_visitors_max * conversionRate * avgSpend / 100
  ) * 100

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
