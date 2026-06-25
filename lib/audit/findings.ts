/**
 * Findings-first framing for the audit report: a ✓/✕ key-findings list and
 * plain-language observations about why competitors may be winning. Pure +
 * deterministic; only states what the evidence supports (no claims about
 * competitors' own websites, which we don't inspect). Bilingual via lang.
 */

import { Language } from '@/lib/i18n'

export interface Finding { ok: boolean; label: string }

export interface FindingsInput {
  mentioned: boolean
  ownCited: boolean
  /** website signals: present ones and the gaps (missing/weak) as labels */
  presentSignals: string[]
  gapSignals: string[]
}

const FT = {
  en: {
    recYes: 'Recommended by AI for some searches',
    recNo: 'Not recommended by AI in the searches tested',
    citedYes: 'Your website was cited by AI',
    citedNo: 'Your website was not cited by AI',
  },
  nl: {
    recYes: 'Door AI aanbevolen voor sommige zoekopdrachten',
    recNo: 'Niet door AI aanbevolen in de geteste zoekopdrachten',
    citedYes: 'Je website werd door AI genoemd als bron',
    citedNo: 'Je website werd niet door AI genoemd als bron',
  },
}

/** A short ✓/✕ list covering recommendation status, key signals, and citation. */
export function buildKeyFindings(i: FindingsInput, lang: Language = 'en'): Finding[] {
  const T = FT[lang]
  const findings: Finding[] = []
  findings.push({ ok: i.mentioned, label: i.mentioned ? T.recYes : T.recNo })
  findings.push({ ok: i.ownCited, label: i.ownCited ? T.citedYes : T.citedNo })
  // A couple of the strongest present signals, then the top gaps.
  for (const s of i.presentSignals.slice(0, 2)) findings.push({ ok: true, label: s })
  for (const s of i.gapSignals.slice(0, 4)) findings.push({ ok: false, label: s })
  return findings.slice(0, 7)
}

export interface ObservationsInput {
  mentioned: boolean
  ownCited: boolean
  authorityPlatforms: string[]      // platform labels AI cited
  topCompetitors: { name: string; mention_count: number }[]
  gapSignals: string[]
}

/** Evidence-based "why competitors may be winning" observations. */
export function buildCompetitorObservations(i: ObservationsInput, lang: Language = 'en'): string[] {
  const obs: string[] = []
  const nl = lang === 'nl'

  const ahead = i.topCompetitors.filter((c) => c.mention_count > 0).slice(0, 3)
  if (ahead.length > 0) {
    obs.push(nl
      ? `AI noemde ${ahead.map((c) => c.name).join(', ')} in de geteste zoekopdrachten${i.mentioned ? '' : ', terwijl jouw restaurant niet verscheen'}.`
      : `AI named ${ahead.map((c) => c.name).join(', ')} across the searches tested${i.mentioned ? '' : ' while your restaurant did not appear'}.`)
  }

  if (i.authorityPlatforms.length > 0) {
    const plats = i.authorityPlatforms.slice(0, 4).join(', ')
    obs.push(nl
      ? `Bij het beantwoorden leunden de modellen op ${plats}. ${i.ownCited ? 'Jouw site stond tussen de bronnen, wat helpt.' : 'Jouw site werd niet genoemd — restaurants op de bronnen die AI vertrouwt zijn makkelijker aan te bevelen.'}`
      : `When answering, the models leaned on ${plats}. ${i.ownCited ? 'Your site was among the cited sources, which helps.' : 'Your site was not cited — restaurants present on the sources AI trusts are easier to recommend.'}`)
  }

  if (i.gapSignals.length > 0) {
    const gaps = i.gapSignals.slice(0, 3).join(', ').toLowerCase()
    obs.push(nl
      ? `Je website mist signalen waar AI vaak op vertrouwt: ${gaps}. Deze versterken maakt je keuken, locatie en aanbod beter leesbaar voor AI.`
      : `Your website is missing signals AI commonly relies on: ${gaps}. Strengthening these makes your cuisine, location and offering easier for AI to read.`)
  }

  return obs
}
