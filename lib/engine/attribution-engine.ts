/**
 * Finded Attribution Engine
 *
 * Honest design principles:
 * 1. Never claim causation where only correlation exists
 * 2. Always show confidence level and assumptions
 * 3. Separate measured data from modeled estimates
 * 4. Dark traffic multiplier is explicit, not hidden
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient_data'

export interface TrafficData {
  source: string
  sessions: number
  conversions: number
  conversionValue: number
  period: 'before' | 'after'
}

export interface AttributionInput {
  restaurantId: string
  businessType: string

  // Recommendation data (from audit engine)
  recommendationScoreBefore: number   // 0-100
  recommendationScoreAfter: number    // 0-100
  auditDateBefore: string
  auditDateAfter: string

  // Traffic data (from GA4 or manual input)
  trafficBefore: TrafficData[]
  trafficAfter: TrafficData[]

  // Business assumptions
  avgBookingValue: number       // €45 for restaurant, etc.
  avgSessionsPerMonth: number   // baseline traffic

  // Integration availability
  hasAnalyticsIntegration: boolean
  hasRevenueIntegration: boolean
}

export interface AttributionResult {
  // What we actually measured
  measured: {
    recommendationLiftPct: number
    aiSessionsBefore: number
    aiSessionsAfter: number
    aiTrafficLiftPct: number | null       // null if no analytics integration
    aiConversionsBefore: number
    aiConversionsAfter: number
    measuredRevenue: number               // directly tracked
  }

  // What we estimated (modeled)
  estimated: {
    // Dark traffic: people influenced by AI but didn't click through
    // Industry estimate: 2-5x of tracked AI traffic
    darkTrafficMultiplier: number
    estimatedTotalAiInfluencedSessions: number

    revenueMin: number
    revenueMid: number
    revenueMax: number

    additionalVisitorsMin: number
    additionalVisitorsMid: number
    additionalVisitorsMax: number

    additionalLeadsMin: number
    additionalLeadsMid: number
    additionalLeadsMax: number
  }

  // Confidence assessment
  confidence: {
    level: ConfidenceLevel
    score: number          // 0-1
    reasons: string[]      // why confidence is this level
    limitations: string[]  // explicit caveats
  }

  // Human-readable summary
  summary: {
    headline: string
    subheadline: string
    keyFindings: string[]
    caveats: string[]
  }
}

// ── AI referrer domains ───────────────────────────────────────────────────────

export const AI_REFERRER_DOMAINS = [
  'chatgpt.com', 'chat.openai.com',
  'perplexity.ai',
  'claude.ai',
  'gemini.google.com', 'bard.google.com',
  'copilot.microsoft.com', 'bing.com/chat',
  'you.com',
  'phind.com',
]

export function isAiReferrer(source: string): boolean {
  return AI_REFERRER_DOMAINS.some(domain =>
    source.toLowerCase().includes(domain.replace('.', ''))
    || source.toLowerCase().includes(domain)
  )
}

// ── Confidence scoring ────────────────────────────────────────────────────────

function computeConfidence(input: AttributionInput): { level: ConfidenceLevel; score: number; reasons: string[]; limitations: string[] } {
  const reasons: string[] = []
  const limitations: string[] = []
  let score = 0

  // Analytics integration: +40 points
  if (input.hasAnalyticsIntegration) {
    score += 40
    reasons.push('Direct traffic data from analytics integration')
  } else {
    limitations.push('No analytics integration — traffic data is estimated, not measured')
  }

  // Revenue integration: +30 points
  if (input.hasRevenueIntegration) {
    score += 30
    reasons.push('Revenue data from direct integration (Stripe/Calendly/etc)')
  } else {
    limitations.push('No revenue integration — revenue impact is modeled from conversion rate assumptions')
  }

  // Recommendation lift magnitude: +20 points if meaningful
  const recLift = input.recommendationScoreAfter - input.recommendationScoreBefore
  if (recLift >= 20) {
    score += 20
    reasons.push(`Strong recommendation lift (+${recLift} points) makes traffic correlation more plausible`)
  } else if (recLift >= 10) {
    score += 10
    reasons.push(`Moderate recommendation lift (+${recLift} points)`)
  } else if (recLift <= 0) {
    limitations.push('No recommendation improvement detected — revenue impact claim is not supported')
  }

  // Traffic volume: +10 points if statistically meaningful
  const totalAiSessionsAfter = input.trafficAfter
    .filter(t => isAiReferrer(t.source))
    .reduce((s, t) => s + t.sessions, 0)

  if (totalAiSessionsAfter >= 50) {
    score += 10
    reasons.push('Sufficient AI traffic volume for meaningful analysis')
  } else {
    limitations.push('Low AI traffic volume — estimates have high variance')
  }

  // Dark traffic caveat always present
  limitations.push('Dark traffic (AI-influenced visits without trackable referrer) cannot be measured — only estimated')
  limitations.push('Correlation between recommendation changes and business outcomes does not prove causation')

  const level: ConfidenceLevel =
    score >= 75 ? 'high' :
    score >= 50 ? 'medium' :
    score >= 25 ? 'low' :
    'insufficient_data'

  return { level, score: score / 100, reasons, limitations }
}

// ── Core computation ──────────────────────────────────────────────────────────

export function computeAttribution(input: AttributionInput): AttributionResult {
  // Separate AI vs non-AI traffic
  const aiTrafficBefore = input.trafficBefore.filter(t => isAiReferrer(t.source))
  const aiTrafficAfter  = input.trafficAfter.filter(t => isAiReferrer(t.source))

  const aiSessionsBefore     = aiTrafficBefore.reduce((s, t) => s + t.sessions, 0)
  const aiSessionsAfter      = aiTrafficAfter.reduce((s, t) => s + t.sessions, 0)
  const aiConversionsBefore  = aiTrafficBefore.reduce((s, t) => s + t.conversions, 0)
  const aiConversionsAfter   = aiTrafficAfter.reduce((s, t) => s + t.conversions, 0)
  const measuredRevenue      = aiTrafficAfter.reduce((s, t) => s + t.conversionValue, 0)

  const aiTrafficLiftPct = input.hasAnalyticsIntegration && aiSessionsBefore > 0
    ? ((aiSessionsAfter - aiSessionsBefore) / aiSessionsBefore) * 100
    : null

  const recommendationLiftPct = input.recommendationScoreBefore > 0
    ? ((input.recommendationScoreAfter - input.recommendationScoreBefore) / input.recommendationScoreBefore) * 100
    : 0

  // Dark traffic model
  // Assumption: for every tracked AI click-through, 2-5 more people were influenced
  // but found the business via direct search, Google Maps, or walking in
  // This is based on general "dark social" research — conservative estimate is 2x, optimistic 5x
  const DARK_TRAFFIC_MULTIPLIER_MIN = 2.0
  const DARK_TRAFFIC_MULTIPLIER_MID = 3.0
  const DARK_TRAFFIC_MULTIPLIER_MAX = 5.0

  const additionalAiSessions = Math.max(0, aiSessionsAfter - aiSessionsBefore)

  const additionalVisitorsMin = Math.round(additionalAiSessions * DARK_TRAFFIC_MULTIPLIER_MIN)
  const additionalVisitorsMid = Math.round(additionalAiSessions * DARK_TRAFFIC_MULTIPLIER_MID)
  const additionalVisitorsMax = Math.round(additionalAiSessions * DARK_TRAFFIC_MULTIPLIER_MAX)

  // Conversion rate assumption
  // Use measured rate if available, otherwise use business-type defaults
  const measuredConvRate = aiSessionsAfter > 0 ? aiConversionsAfter / aiSessionsAfter : null
  const DEFAULT_CONVERSION_RATES: Record<string, number> = {
    restaurant: 0.15,   // 15% of AI-referred visitors make a reservation
    hotel:      0.08,
    dentist:    0.12,
    lawyer:     0.10,
    default:    0.10,
  }
  const convRate = measuredConvRate
    ?? DEFAULT_CONVERSION_RATES[input.businessType]
    ?? DEFAULT_CONVERSION_RATES.default

  const additionalLeadsMin = Math.round(additionalVisitorsMin * convRate)
  const additionalLeadsMid = Math.round(additionalVisitorsMid * convRate)
  const additionalLeadsMax = Math.round(additionalVisitorsMax * convRate)

  const revenueMin = Math.round(additionalLeadsMin * input.avgBookingValue)
  const revenueMid = Math.round(additionalLeadsMid * input.avgBookingValue)
  const revenueMax = Math.round(additionalLeadsMax * input.avgBookingValue)

  const confidence = computeConfidence(input)

  // Summary generation
  const hasLift = recommendationLiftPct > 0
  const headline = hasLift
    ? `AI recommendation frequency increased ${Math.round(recommendationLiftPct)}%`
    : 'No significant change in AI recommendation frequency'

  const subheadline = input.hasAnalyticsIntegration && aiTrafficLiftPct !== null
    ? `Tracked AI referral traffic ${aiTrafficLiftPct >= 0 ? 'up' : 'down'} ${Math.abs(Math.round(aiTrafficLiftPct))}% in the same period`
    : 'No analytics integration — traffic impact is estimated'

  const keyFindings: string[] = []
  if (recommendationLiftPct > 0) keyFindings.push(`Recommendation score improved from ${input.recommendationScoreBefore} to ${input.recommendationScoreAfter}`)
  if (aiTrafficLiftPct !== null && aiTrafficLiftPct > 0) keyFindings.push(`${Math.round(aiTrafficLiftPct)}% more visitors arriving from AI platforms`)
  if (revenueMid > 0) keyFindings.push(`Estimated additional revenue: €${revenueMin.toLocaleString()}–€${revenueMax.toLocaleString()} (${confidence.level} confidence)`)
  if (additionalVisitorsMid > 0) keyFindings.push(`Estimated ${additionalVisitorsMin}–${additionalVisitorsMax} additional visitors influenced by AI recommendations`)

  return {
    measured: {
      recommendationLiftPct,
      aiSessionsBefore,
      aiSessionsAfter,
      aiTrafficLiftPct,
      aiConversionsBefore,
      aiConversionsAfter,
      measuredRevenue,
    },
    estimated: {
      darkTrafficMultiplier: DARK_TRAFFIC_MULTIPLIER_MID,
      estimatedTotalAiInfluencedSessions: additionalVisitorsMid,
      revenueMin,
      revenueMid,
      revenueMax,
      additionalVisitorsMin,
      additionalVisitorsMid,
      additionalVisitorsMax,
      additionalLeadsMin,
      additionalLeadsMid,
      additionalLeadsMax,
    },
    confidence,
    summary: {
      headline,
      subheadline,
      keyFindings,
      caveats: confidence.limitations,
    },
  }
}

// ── Integration data mapping ──────────────────────────────────────────────────

/**
 * What each integration provides and its limitations.
 * Use this to set user expectations during onboarding.
 */
export const INTEGRATION_CAPABILITIES = {
  google_analytics: {
    provides: ['AI referrer sessions', 'Goal completions', 'Revenue (if ecommerce)', 'Session duration', 'Bounce rate'],
    limitations: ['Does not capture dark traffic', 'AI referrers may appear as direct/organic', 'Requires goal setup by user'],
    attribution_quality: 'medium' as const,
    setup_complexity: 'medium' as const,
  },
  search_console: {
    provides: ['Branded search volume (proxy for AI-driven brand awareness)', 'Impression trends'],
    limitations: ['Not direct AI attribution', 'Correlation only'],
    attribution_quality: 'low' as const,
    setup_complexity: 'low' as const,
  },
  stripe: {
    provides: ['Revenue per transaction', 'Customer lifetime value', 'Revenue trends'],
    limitations: ['No referrer data — cannot link to AI source without UTM params'],
    attribution_quality: 'low' as const,
    setup_complexity: 'medium' as const,
  },
  calendly: {
    provides: ['Booking count', 'Booking source if UTM tracked', 'Conversion timing'],
    limitations: ['Source tracking requires UTM setup on booking links'],
    attribution_quality: 'medium' as const,
    setup_complexity: 'low' as const,
  },
  hubspot: {
    provides: ['Lead source', 'Lead volume', 'Deal value', 'Pipeline data'],
    limitations: ['AI source attribution requires UTM tracking discipline'],
    attribution_quality: 'medium' as const,
    setup_complexity: 'high' as const,
  },
  shopify: {
    provides: ['Revenue', 'Orders', 'Referrer source (if tracked)', 'Conversion rate'],
    limitations: ['AI referrer tracking depends on GA4 integration'],
    attribution_quality: 'medium' as const,
    setup_complexity: 'low' as const,
  },
}
