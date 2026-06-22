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
}

export function reportStrings(language: Language): ReportStrings {
  return language === 'nl' ? NL : EN
}
