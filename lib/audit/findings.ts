/**
 * Findings-first framing for the audit report: a ✓/✕ key-findings list and
 * plain-language observations about why competitors may be winning. Pure +
 * deterministic; only states what the evidence supports (no claims about
 * competitors' own websites, which we don't inspect).
 */

export interface Finding { ok: boolean; label: string }

export interface FindingsInput {
  mentioned: boolean
  ownCited: boolean
  /** website signals: present ones and the gaps (missing/weak) as labels */
  presentSignals: string[]
  gapSignals: string[]
}

/** A short ✓/✕ list covering recommendation status, key signals, and citation. */
export function buildKeyFindings(i: FindingsInput): Finding[] {
  const findings: Finding[] = []
  findings.push({ ok: i.mentioned, label: i.mentioned ? 'Recommended by AI for some searches' : 'Not recommended by AI in the searches tested' })
  findings.push({ ok: i.ownCited, label: i.ownCited ? 'Your website was cited by AI' : 'Your website was not cited by AI' })
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
export function buildCompetitorObservations(i: ObservationsInput): string[] {
  const obs: string[] = []

  const ahead = i.topCompetitors.filter((c) => c.mention_count > 0).slice(0, 3)
  if (ahead.length > 0) {
    obs.push(
      `AI named ${ahead.map((c) => c.name).join(', ')} across the searches tested` +
      `${i.mentioned ? '' : ' while your restaurant did not appear'}.`,
    )
  }

  if (i.authorityPlatforms.length > 0) {
    obs.push(
      `When answering, the models leaned on ${i.authorityPlatforms.slice(0, 4).join(', ')}. ` +
      `${i.ownCited
        ? 'Your site was among the cited sources, which helps.'
        : 'Your site was not cited — restaurants present on the sources AI trusts are easier to recommend.'}`,
    )
  }

  if (i.gapSignals.length > 0) {
    obs.push(
      `Your website is missing signals AI commonly relies on: ${i.gapSignals.slice(0, 3).join(', ').toLowerCase()}. ` +
      `Strengthening these makes your cuisine, location and offering easier for AI to read.`,
    )
  }

  return obs
}
