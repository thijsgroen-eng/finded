/**
 * Plain-language "why this result" synthesis.
 *
 * Turns the audit evidence into the one paragraph the report's core question
 * demands: are you recommended, who is instead, and the likely reasons. Pure +
 * deterministic (no LLM) so it's reliable and free, and only states what the
 * evidence supports. Bilingual via lang.
 */

import { Language } from '@/lib/i18n'

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

export function buildVisibilitySummary(i: SummaryInput, lang: Language = 'en'): string {
  const nl = lang === 'nl'
  const parts: string[] = []

  // 1. Where they stand.
  if (i.sampleCount > 0) {
    const byModels = i.providersRan > 0
      ? (nl ? `, door ${i.modelConsensus} van de ${i.providersRan} geteste modellen` : `, by ${i.modelConsensus} of ${i.providersRan} models tested`)
      : ''
    parts.push(nl
      ? `${i.restaurantName} werd genoemd in ${i.totalMentions} van de ${i.sampleCount} AI-antwoorden (${Math.round(i.mentionFrequencyPct)}%)${byModels}.`
      : `${i.restaurantName} was named in ${i.totalMentions} of ${i.sampleCount} AI answers (${Math.round(i.mentionFrequencyPct)}%)${byModels}.`)
  } else {
    parts.push(nl
      ? `We hebben nog niet genoeg geregistreerde antwoorden om de AI-zichtbaarheid van ${i.restaurantName} te beoordelen.`
      : `We don't have enough recorded answers to assess ${i.restaurantName}'s AI visibility yet.`)
  }

  // 2. Who is recommended instead.
  const ahead = i.topCompetitors.filter((c) => c.mention_count > i.totalMentions).slice(0, 3)
  if (ahead.length > 0) {
    const list = ahead.map((c) => `${c.name} (${c.mention_count})`).join(', ')
    parts.push(nl ? `Vaker genoemd in plaats daarvan: ${list}.` : `Named more often instead: ${list}.`)
  } else if (i.topCompetitors.length > 0 && i.totalMentions === 0) {
    parts.push(nl
      ? `Andere restaurants worden aanbevolen voor deze zoekopdrachten; jij hoort daar nog niet bij.`
      : `Other restaurants are being recommended for these searches; you are not yet among them.`)
  }

  // 3. Likely reasons (website gaps).
  if (i.websiteGaps.length > 0) {
    const gaps = i.websiteGaps.slice(0, 3).join(', ').toLowerCase()
    parts.push(nl ? `Waarschijnlijke redenen aan jouw kant: ${gaps}.` : `Likely reasons on your side: ${gaps}.`)
  }

  // 4. Where AI is looking (authority).
  if (i.authorityPlatforms.length > 0) {
    const plats = i.authorityPlatforms.slice(0, 4).join(', ')
    parts.push(nl
      ? `Bij het beantwoorden leunden de modellen op ${plats} — ${i.ownCited ? 'jouw eigen site stond tussen de bronnen.' : 'jouw eigen site stond niet tussen de bronnen.'}`
      : `When answering, the models leaned on ${plats} — ${i.ownCited ? 'your own site was among the sources.' : 'your own site was not among the sources.'}`)
  }

  return parts.join(' ')
}
