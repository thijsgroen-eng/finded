/**
 * Competitor visibility comparison — the "why are they recommended instead of me"
 * core. Grades the SAME AI-readable signals for the audited restaurant and each
 * crawled competitor, then builds a comparison table, per-competitor "why they
 * win" notes, and the biggest competitive gaps. Pure + deterministic; only states
 * signals actually detected (no SEO metrics, no unsupported claims).
 */

export type Grade = 'Strong' | 'Medium' | 'Weak' | 'Missing'

/** Subset of a website audit we grade (target + competitors share this shape). */
export interface SiteSignals {
  meta_title?: string | null
  meta_description?: string | null
  menu_format?: string | null
  menu_richness?: string | null
  location_present?: boolean | null
  contact_present?: boolean | null
  faq_present?: boolean | null
  review_signals?: boolean | null
  review_count?: number | null
  schema_present?: boolean | null
  schema_types?: string[] | null
  raw_html_snippet?: string | null
}

export const COMPARISON_SIGNALS = [
  { key: 'cuisine_clarity', label: 'Cuisine clarity' },
  { key: 'location_clarity', label: 'Location clarity' },
  { key: 'menu', label: 'Menu discoverability' },
  { key: 'faq', label: 'FAQ coverage' },
  { key: 'authority', label: 'Authority signals' },
  { key: 'reviews', label: 'Review signals' },
  { key: 'schema', label: 'Structured data' },
] as const
export type SignalKey = (typeof COMPARISON_SIGNALS)[number]['key']

const CUISINE_WORDS = /italiaan|italian|frans|french|japans|japanese|sushi|grieks|greek|spaans|spanish|indiaas|indian|thai|indonesisch|indonesian|mexicaan|mexican|vegan|seafood|steak|pizza|brasserie|bistro|tapas|ramen|burger/i
const AWARD_WORDS = /michelin|bib gourmand|gault|award|bekroond|genomineerd|featured in|as seen in/i

export function scoreSignals(wa: SiteSignals): Record<SignalKey, Grade> {
  const meta = `${wa.meta_title ?? ''} ${wa.meta_description ?? ''}`
  const snippet = wa.raw_html_snippet ?? ''
  const types = (wa.schema_types ?? []).map((t) => t.toLowerCase())

  const cuisine: Grade = CUISINE_WORDS.test(meta) ? 'Strong'
    : (wa.menu_format && wa.menu_format !== 'none') ? 'Medium' : 'Weak'

  const location: Grade = wa.location_present ? 'Strong' : wa.contact_present ? 'Medium' : 'Weak'

  const menu: Grade = wa.menu_format === 'html' ? 'Strong'
    : (wa.menu_format === 'pdf' || wa.menu_format === 'image') ? 'Medium' : 'Weak'

  const faq: Grade = wa.faq_present ? 'Strong' : 'Missing'

  const authority: Grade = AWARD_WORDS.test(`${meta} ${snippet}`) ? 'Strong'
    : wa.review_signals ? 'Medium' : 'Weak'

  const reviews: Grade = (wa.review_count ?? 0) > 0 ? 'Strong' : wa.review_signals ? 'Medium' : 'Weak'

  const schema: Grade = types.some((t) => t.includes('restaurant') || t.includes('localbusiness')) ? 'Strong'
    : wa.schema_present ? 'Medium' : 'Weak'

  return { cuisine_clarity: cuisine, location_clarity: location, menu, faq, authority, reviews, schema }
}

const RANK: Record<Grade, number> = { Missing: 0, Weak: 1, Medium: 2, Strong: 3 }

export interface CompetitorSite { name: string; website: string | null; signals: SiteSignals | null }

export interface ComparisonRow {
  key: SignalKey
  label: string
  you: Grade
  competitors: { name: string; grade: Grade | null }[]
}

export interface CompetitorComparison {
  rows: ComparisonRow[]
  whyWin: { name: string; reasons: string }[]
  gaps: string[]
  /** competitors that actually had a crawlable website */
  crawled: number
}

const SIGNAL_LABELS_NL: Record<SignalKey, string> = {
  cuisine_clarity: 'Keukenduidelijkheid', location_clarity: 'Locatieduidelijkheid', menu: 'Menuvindbaarheid',
  faq: 'FAQ-dekking', authority: 'Autoriteitssignalen', reviews: 'Reviewsignalen', schema: 'Gestructureerde data',
}
const signalLabel = (sig: { key: SignalKey; label: string }, lang: Lang) =>
  lang === 'nl' ? SIGNAL_LABELS_NL[sig.key] : sig.label

type Lang = 'nl' | 'en'

export function buildCompetitorComparison(target: SiteSignals, competitors: CompetitorSite[], lang: Lang = 'en'): CompetitorComparison {
  const youScores = scoreSignals(target)
  const compScores = competitors.map((c) => ({ name: c.name, signals: c.signals, scores: c.signals ? scoreSignals(c.signals) : null }))

  const rows: ComparisonRow[] = COMPARISON_SIGNALS.map((sig) => ({
    key: sig.key,
    label: signalLabel(sig, lang),
    you: youScores[sig.key],
    competitors: compScores.map((c) => ({ name: c.name, grade: c.scores ? c.scores[sig.key] : null })),
  }))

  // Why each (crawlable) competitor may win: list their Strong signals.
  const whyWin = compScores.filter((c) => c.scores).map((c) => {
    const strong = COMPARISON_SIGNALS.filter((sig) => c.scores![sig.key] === 'Strong').map((sig) => signalLabel(sig, lang).toLowerCase())
    const reasons = strong.length
      ? (lang === 'nl'
          ? `${c.name} scoort sterk op ${strong.join(', ')} — signalen die AI kan lezen en gebruiken.`
          : `${c.name} shows strong ${strong.join(', ')} — signals AI can read and act on.`)
      : (lang === 'nl'
          ? `${c.name} verschijnt vaak, al zijn de websitesignalen gemengd.`
          : `${c.name} appears frequently, though its website signals are mixed.`)
    return { name: c.name, reasons }
  })

  // Biggest gaps: signals where you are Weak/Missing but a competitor is Strong.
  const gaps: string[] = []
  for (const sig of COMPARISON_SIGNALS) {
    const youGrade = youScores[sig.key]
    if (RANK[youGrade] >= RANK.Medium) continue
    const aheadCount = compScores.filter((c) => c.scores && RANK[c.scores[sig.key]] >= RANK.Strong).length
    if (aheadCount > 0) {
      const lbl = signalLabel(sig, lang).toLowerCase()
      gaps.push(lang === 'nl'
        ? `${aheadCount} van de topconcurrenten bieden sterke ${lbl} terwijl jouw site dat niet doet.`
        : `${aheadCount} of the top competitors provide strong ${lbl} while your site does not.`)
    }
  }

  return { rows, whyWin, gaps, crawled: compScores.filter((c) => c.scores).length }
}
