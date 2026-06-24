/**
 * Plain-language "why this result" synthesis.
 *
 * Turns the audit evidence into the one paragraph the report's core question
 * demands: are you recommended, who is instead, and the likely reasons. Pure +
 * deterministic (no LLM) so it's reliable and free, and only states what the
 * evidence supports.
 */

export interface SummaryInput {
  restaurantName: string
  totalMentions: number
  sampleCount: number
  mentionFrequencyPct: number       // 0–100
  modelConsensus: number
  providersRan: number
  topCompetitors: { name: string; mention_count: number }[]
  websiteGaps: string[]             // labels of missing/weak website signals
  authorityPlatforms: string[]      // platform labels AI cited (e.g. "Tripadvisor")
  ownCited: boolean                 // was the restaurant's own site cited?
}

export function buildVisibilitySummary(i: SummaryInput): string {
  const parts: string[] = []

  // 1. Where they stand.
  if (i.sampleCount > 0) {
    parts.push(
      `${i.restaurantName} was named in ${i.totalMentions} of ${i.sampleCount} AI answers (${Math.round(i.mentionFrequencyPct)}%)` +
      `${i.providersRan > 0 ? `, by ${i.modelConsensus} of ${i.providersRan} models tested` : ''}.`,
    )
  } else {
    parts.push(`We don't have enough recorded answers to assess ${i.restaurantName}'s AI visibility yet.`)
  }

  // 2. Who is recommended instead.
  const ahead = i.topCompetitors.filter((c) => c.mention_count > i.totalMentions).slice(0, 3)
  if (ahead.length > 0) {
    parts.push(
      `Named more often instead: ${ahead.map((c) => `${c.name} (${c.mention_count})`).join(', ')}.`,
    )
  } else if (i.topCompetitors.length > 0 && i.totalMentions === 0) {
    parts.push(`Other restaurants are being recommended for these searches; you are not yet among them.`)
  }

  // 3. Likely reasons (website gaps).
  if (i.websiteGaps.length > 0) {
    parts.push(`Likely reasons on your side: ${i.websiteGaps.slice(0, 3).join(', ').toLowerCase()}.`)
  }

  // 4. Where AI is looking (authority).
  if (i.authorityPlatforms.length > 0) {
    parts.push(
      `When answering, the models leaned on ${i.authorityPlatforms.slice(0, 4).join(', ')} — ` +
      `${i.ownCited ? 'your own site was among the sources.' : 'your own site was not among the sources.'}`,
    )
  }

  return parts.join(' ')
}
