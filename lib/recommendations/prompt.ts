import { FIX_TYPES, FIX_TYPE_HINTS } from '@/lib/engine/fix-types'
import { buildCompetitorComparison } from '@/lib/audit/competitor-comparison'
import { computePatterns, patternEvidence, ObsRow } from '@/lib/observations'

/**
 * Recommendation prompt assembly (#8) — the LLM's text-only contract.
 *
 * This builds the structured facts + the prompt the model sees. Crucially the
 * model is asked ONLY to write prose; every number/classification on the stored
 * recommendation is computed deterministically afterwards (see enrich.ts). Pure.
 */

export interface PromptRestaurant {
  name: string
  city: string
  cuisine: string | null
  website: string | null
}

interface MentionRow { prompt_id: string; mentioned: boolean; mention_frequency: number | null }
interface PromptRunRow { prompt_id: string; category: string; prompt_text: string }
interface CompetitorRow { name: string; mention_count: number }
interface Metrics {
  mention_frequency: number
  position_score: number
  model_consensus: number
  total_mentions: number
  total_prompts: number
  model_breakdown: { model: string; frequency: number; mentions: number }[]
  sentiment_breakdown: { positive: number; neutral: number; negative: number }
}

export interface PromptInput {
  restaurant: PromptRestaurant
  metrics: Metrics
  mentions: MentionRow[]
  promptRuns: PromptRunRow[]
  competitors: CompetitorRow[]
  websiteAudit: Record<string, any> | null
  competitorAudits: { competitor_name: string; website: string | null; signals: any }[]
  scoreBreakdownComponents: { label: string; score: number }[] | null
  visibilityScore: number | null
  obsRows: ObsRow[]
  langName: string
}

export function buildRecommendationPrompt(input: PromptInput): string {
  const { restaurant, metrics, mentions, promptRuns, competitors, websiteAudit, competitorAudits, obsRows, langName } = input

  // Cuisine-specific visibility: the queries this restaurant can realistically win.
  const appeared = new Map<string, boolean>()
  for (const m of mentions) {
    const did = m.mentioned || (m.mention_frequency ?? 0) > 0
    appeared.set(m.prompt_id, (appeared.get(m.prompt_id) ?? false) || did)
  }
  const cuisinePrompts = promptRuns.filter((p) => p.category === 'category')
  const wonCuisine = cuisinePrompts.filter((p) => appeared.get(p.prompt_id)).map((p) => p.prompt_text)
  const missedCuisine = cuisinePrompts.filter((p) => !appeared.get(p.prompt_id)).map((p) => p.prompt_text)
  const cuisineLabel = restaurant.cuisine ?? 'its cuisine'

  const cuisineAnalysis = cuisinePrompts.length === 0 ? '' : `

CUISINE-SPECIFIC VISIBILITY (the queries a ${cuisineLabel} restaurant should win):
- Appears for: ${wonCuisine.length ? wonCuisine.map((q) => `"${q}"`).join(', ') : 'NONE'}
- MISSING from: ${missedCuisine.length ? missedCuisine.map((q) => `"${q}"`).join(', ') : 'none — good coverage'}`

  const modelBreakdown = metrics.model_breakdown
    .map((m) => `${m.model}: ${Math.round(m.frequency * 100)}% (${m.mentions} mentions)`)
    .join('\n')

  const myMentions = metrics.total_mentions
  const competitorGap = competitors.length === 0
    ? '\n\nCOMPETITOR GAP: no competitors were extracted.'
    : `\n\nCOMPETITOR GAP (AI recommends these instead — close this gap):\n${competitors
        .map((c) => `- ${c.name}: ${c.mention_count} mentions vs your ${myMentions}`).join('\n')}`

  const comparison = buildCompetitorComparison(
    websiteAudit ?? {},
    competitorAudits.map((ca) => ({ name: ca.competitor_name, website: ca.website, signals: ca.signals })),
  )
  const competitorSignals = comparison.crawled === 0
    ? '\n\nCOMPETITOR WEBSITE SIGNALS: no competitor sites could be crawled — do NOT make any claims about competitors\' websites.'
    : `\n\nCOMPETITOR WEBSITE SIGNALS (${comparison.crawled} competitor site${comparison.crawled === 1 ? '' : 's'} crawled — these signals were actually detected, safe to cite):
Signal-by-signal grade (You vs competitors):
${comparison.rows.map((r) => `- ${r.label}: you=${r.you}; ${r.competitors.map((c) => `${c.name}=${c.grade ?? 'n/a'}`).join('; ')}`).join('\n')}
Why competitors may win:
${comparison.whyWin.map((w) => `- ${w.reasons}`).join('\n')}
Biggest competitive gaps (turn these into recommendations):
${comparison.gaps.length ? comparison.gaps.map((g) => `- ${g}`).join('\n') : '- none — your signals match or exceed the crawled competitors'}`

  const breakdown = input.scoreBreakdownComponents
  const scoreContext = breakdown?.length
    ? `\n\nSCORE BREAKDOWN (visibility ${input.visibilityScore ?? '?'}/100 — weakest components are the priority):\n${breakdown
        .map((c) => `- ${c.label}: ${Math.round(c.score)}/100`).join('\n')}`
    : ''

  const websiteSignals = websiteAudit ? `
- Schema.org markup: ${websiteAudit.schema_present ? 'Present' : 'MISSING'}
- Menu page: ${websiteAudit.menu_present ? 'Present' : 'MISSING'}
- Opening hours: ${websiteAudit.opening_hours_present ? 'Present' : 'MISSING'}
- Reservation link: ${websiteAudit.reservation_links_present ? 'Present' : 'MISSING'}
- Social media links: ${websiteAudit.social_links_present ? 'Present' : 'MISSING'}
- Meta title: ${websiteAudit.meta_title ?? 'Not found'}
- Meta description: ${websiteAudit.meta_description ?? 'Not found'}` : 'No website audit data available'

  const patterns = computePatterns(obsRows).slice(0, 6)
  const measuredEvidence = patterns.length
    ? `\n\nMEASURED PATTERNS FROM FINDED'S DATASET (cite as evidence + set confidence when a recommendation matches one; these are real measurements across many audits):\n${patterns.map((p) => `- ${patternEvidence(p, 'en')} [confidence ${p.lift >= 2 ? 'High' : p.lift >= 1.4 ? 'Medium' : 'Low'}]`).join('\n')}`
    : '\n\nMEASURED PATTERNS: not enough audits in the dataset yet to cite measured lift — base confidence on the strength of the audit evidence instead.'

  return `You are an AI visibility consultant for restaurants. Analyse this restaurant's AI visibility audit and generate specific, actionable recommendations.

IMPORTANT: Write EVERY text field (title, what, why, evidence, impact) entirely in ${langName}. Do not mix languages.

RESTAURANT: ${restaurant.name}
CITY: ${restaurant.city}
CUISINE: ${restaurant.cuisine ?? 'Not specified'}
WEBSITE: ${restaurant.website ?? 'Not provided'}

AI VISIBILITY METRICS:
- Overall mention frequency: ${Math.round(metrics.mention_frequency * 100)}%
- Position score: ${Math.round(metrics.position_score)}/100
- Model consensus: ${metrics.model_consensus}/4 models mention this restaurant
- Total mentions: ${metrics.total_mentions} across ${metrics.total_prompts} prompts

PER-MODEL BREAKDOWN:
${modelBreakdown}

SENTIMENT: ${metrics.sentiment_breakdown.positive} positive, ${metrics.sentiment_breakdown.neutral} neutral, ${metrics.sentiment_breakdown.negative} negative

WEBSITE SIGNALS:
${websiteSignals}
${cuisineAnalysis}${competitorGap}${competitorSignals}${scoreContext}${measuredEvidence}

Generate exactly 5 specific, prioritised recommendations to improve this restaurant's AI visibility.
Base each recommendation on the evidence above: the weakest score components, missing website signals, the competitor gap, and the cuisine prompt misses.

Format your response as a JSON array with this exact structure:
[
  {
    "impact_level": "high|medium|low",
    "effort": "high|medium|low",
    "type": ${JSON.stringify([...FIX_TYPES])} or null,
    "title": "Short action title (max 8 words)",
    "what": "Exactly what to do (2-3 sentences, specific and actionable)",
    "why": "Why this will improve AI visibility (1-2 sentences)",
    "evidence": "The specific data point that triggered it — prefer a MEASURED PATTERN above when one matches (e.g. 'Restaurants with an HTML menu were mentioned 2.1× more often'), else a real number from THIS audit (e.g. 'Competitor De Kas named in 9 answers, you in 2')",
    "impact": "Expected impact, plainly stated (e.g. 'Helps you appear for cuisine queries you currently miss')",
    "confidence": "high|medium|low — how strongly the evidence supports the expected impact (High only when a measured pattern backs it)"
  }
]

Fix type guide (choose the closest, or null if none of these implement the fix):
${FIX_TYPES.map((ty) => `- ${ty}: ${FIX_TYPE_HINTS[ty]}`).join('\n')}

Rules:
- "confidence" MUST be high/medium/low. Use "high" ONLY when a MEASURED PATTERN above supports the recommendation; otherwise medium or low. Never overstate.
- "type" MUST be exactly one of the listed values or null — do not invent types.
- "impact_level" = how much this is likely to move AI visibility; "effort" = how hard it is for the owner.
- "evidence" must quote a real number/signal from the audit data above, not a generality.
- Where relevant, tie the recommendation to the COMPETITOR GAP — reference the competitors that are named instead and the specific prompts where they appear and this restaurant doesn't.
- When COMPETITOR WEBSITE SIGNALS are available, connect the chain explicitly: competitor signal → why AI can recommend them → the specific action that closes the gap (e.g. "Competitor X has a crawlable HTML menu and you have a PDF — publish your menu as HTML text"). ONLY cite competitor website signals that appear in the COMPETITOR WEBSITE SIGNALS block above; if none were crawled, make NO claims about competitors' websites. Never mention domain authority, backlinks, or traditional SEO — only what AI can read and extract.
- Be SPECIFIC to this restaurant's actual data
- Prioritise by impact: fix what will move the needle most first
- Give concrete actions, not vague advice
- If a model shows 0%, explain specifically why and what to do
- Reference real platforms (Google Business Profile, TripAdvisor, etc.)
- PRIORITISE the cuisine-specific gaps above — a ${cuisineLabel} restaurant should appear for those queries. If it is MISSING from them, the top recommendations must make the cuisine explicit and machine-readable: state ${cuisineLabel} clearly in the homepage copy and meta description, add Restaurant schema with servesCuisine="${restaurant.cuisine ?? '...'}", and ensure the menu is crawlable (not an image/PDF).
- Do NOT recommend competing for generic "best restaurants in ${restaurant.city}" — that is not where a typical ${cuisineLabel} restaurant wins; focus on cuisine, occasion and neighbourhood queries.
- Write all text fields in ${langName}.
- Return ONLY the JSON array, no other text`
}
