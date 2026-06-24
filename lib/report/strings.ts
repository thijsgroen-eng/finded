import { Language } from '@/lib/i18n'

/** Localized labels for the PDF report (NL default for the restaurant focus, EN fallback). */
export interface ReportStrings {
  brandTagline: string
  reportTitle: string
  auditedOn: string
  visibilityScore: string
  outOf100: string
  mentionFrequency: string
  appearsInResponses: (pct: number) => string
  confidenceBand: string
  basedOnSamples: (n: number) => string
  modelConsensus: string
  modelsFound: (n: number) => string
  perModel: string
  sentiment: string
  positive: string
  neutral: string
  negative: string
  competitors: string
  competitorColumn: string
  mentions: string
  competitorsHiddenNote: (n: number) => string
  recommendations: string
  recommendationsHiddenNote: (n: number) => string
  noData: string
  previewBadge: string
  unlockTitle: string
  unlockBody: string
  estimateCaveat: string
  priorityHigh: string
  priorityMedium: string
  priorityLow: string
  methodology: string
  methodologyBody: (models: number, samples: number | null) => string
  limitations: string
  limitationsBody: string
  websiteSignalsLine: (present: number, total: number) => string
  formulaVersionLine: (version: string) => string
  implementationPlan: string
  suggestedFix: string
  expectedImpact: string
}

const EN: ReportStrings = {
  brandTagline: 'AI Visibility Report',
  reportTitle: 'How AI search sees your business',
  auditedOn: 'Audited on',
  visibilityScore: 'AI Visibility Score',
  outOf100: 'out of 100',
  mentionFrequency: 'Mention frequency',
  appearsInResponses: (pct) => `Appears in ${pct}% of AI responses`,
  confidenceBand: '95% confidence band',
  basedOnSamples: (n) => `based on ${n} sampled responses`,
  modelConsensus: 'Model consensus',
  modelsFound: (n) => `${n} of 4 AI models recommend you`,
  perModel: 'Per AI model',
  sentiment: 'Sentiment',
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
  competitors: 'Competitors recommended more often',
  competitorColumn: 'Competitor',
  mentions: 'Mentions',
  competitorsHiddenNote: (n) => `${n} competitors outrank you. Names and details are in the full report.`,
  recommendations: 'Recommendations',
  recommendationsHiddenNote: (n) => `${n} specific fixes identified. The step-by-step actions are in the full report.`,
  noData: 'Not enough data to report yet.',
  previewBadge: 'PREVIEW',
  unlockTitle: 'This is a preview',
  unlockBody: 'Unlock the full report to see exactly which competitors outrank you and the step-by-step fixes to close the gap.',
  estimateCaveat: 'Scores reflect how often AI assistants mention this business for relevant searches. They are directional, not a guarantee of bookings or revenue.',
  priorityHigh: 'High',
  priorityMedium: 'Medium',
  priorityLow: 'Low',
  methodology: 'How we measured this',
  methodologyBody: (models, samples) =>
    `We asked ${models} leading AI assistants (ChatGPT, Claude, Gemini, Perplexity) the real questions diners use to find restaurants, in Dutch, and repeated each question several times` +
    `${samples ? ` (${samples} sampled answers in total)` : ''}. Every answer was analysed to see whether this restaurant — and its competitors — was named, and at what rank. The visibility score is a weighted average of mention frequency, ranking, model consensus and website signals.`,
  limitations: 'Limitations',
  limitationsBody:
    'AI answers vary between runs, so figures are sampled estimates with a confidence band, not guarantees. Results reflect the moment of the audit and this specific set of questions. Failed model calls are excluded. Any revenue figures are illustrative, not measured.',
  websiteSignalsLine: (present, total) => `Website AI-readiness: ${present} of ${total} signals present.`,
  formulaVersionLine: (version) => `Scoring formula ${version}.`,
  implementationPlan: 'Implementation plan',
  suggestedFix: 'Fix',
  expectedImpact: 'Expected impact',
}

const NL: ReportStrings = {
  brandTagline: 'AI-zichtbaarheidsrapport',
  reportTitle: 'Hoe AI-zoekmachines jouw zaak zien',
  auditedOn: 'Geaudit op',
  visibilityScore: 'AI-zichtbaarheidsscore',
  outOf100: 'van de 100',
  mentionFrequency: 'Vermeldingsfrequentie',
  appearsInResponses: (pct) => `Verschijnt in ${pct}% van de AI-antwoorden`,
  confidenceBand: '95%-betrouwbaarheidsmarge',
  basedOnSamples: (n) => `op basis van ${n} steekproefantwoorden`,
  modelConsensus: 'Modelconsensus',
  modelsFound: (n) => `${n} van de 4 AI-modellen raden je aan`,
  perModel: 'Per AI-model',
  sentiment: 'Sentiment',
  positive: 'Positief',
  neutral: 'Neutraal',
  negative: 'Negatief',
  competitors: 'Concurrenten die vaker worden aanbevolen',
  competitorColumn: 'Concurrent',
  mentions: 'Vermeldingen',
  competitorsHiddenNote: (n) => `${n} concurrenten scoren hoger dan jij. Namen en details staan in het volledige rapport.`,
  recommendations: 'Aanbevelingen',
  recommendationsHiddenNote: (n) => `${n} concrete verbeterpunten gevonden. De stappenplannen staan in het volledige rapport.`,
  noData: 'Nog niet genoeg data voor een rapport.',
  previewBadge: 'VOORBEELD',
  unlockTitle: 'Dit is een voorbeeld',
  unlockBody: 'Ontgrendel het volledige rapport om te zien welke concurrenten hoger scoren en welke concrete stappen het gat dichten.',
  estimateCaveat: 'Scores geven weer hoe vaak AI-assistenten deze zaak noemen bij relevante zoekopdrachten. Ze zijn indicatief en geen garantie voor reserveringen of omzet.',
  priorityHigh: 'Hoog',
  priorityMedium: 'Middel',
  priorityLow: 'Laag',
  methodology: 'Hoe we dit hebben gemeten',
  methodologyBody: (models, samples) =>
    `We stelden ${models} toonaangevende AI-assistenten (ChatGPT, Claude, Gemini, Perplexity) de echte vragen die gasten gebruiken om restaurants te vinden, in het Nederlands, en herhaalden elke vraag meerdere keren` +
    `${samples ? ` (in totaal ${samples} steekproefantwoorden)` : ''}. Elk antwoord is geanalyseerd om te zien of dit restaurant — en de concurrenten — werd genoemd, en op welke positie. De zichtbaarheidsscore is een gewogen gemiddelde van vermeldingsfrequentie, positie, modelconsensus en websitesignalen.`,
  limitations: 'Beperkingen',
  limitationsBody:
    'AI-antwoorden variëren per keer, dus de cijfers zijn steekproefschattingen met een betrouwbaarheidsmarge, geen garanties. De resultaten weerspiegelen het moment van de audit en deze specifieke set vragen. Mislukte modelaanroepen zijn uitgesloten. Eventuele omzetbedragen zijn illustratief, niet gemeten.',
  websiteSignalsLine: (present, total) => `Website-gereedheid voor AI: ${present} van de ${total} signalen aanwezig.`,
  formulaVersionLine: (version) => `Scoreformule ${version}.`,
  implementationPlan: 'Implementatieplan',
  suggestedFix: 'Oplossing',
  expectedImpact: 'Verwachte impact',
}

export function reportStrings(language: Language): ReportStrings {
  return language === 'nl' ? NL : EN
}
