/**
 * Restaurant audit prompt corpus.
 *
 * The questions diners actually ask AI assistants, as restaurant-specific
 * templates with metadata (intent, language, weight). `buildAuditPrompts` renders
 * a STABLE, DETERMINISTIC set from a restaurant's city/cuisine/neighbourhood —
 * no randomness — so an audit is repeatable and re-auditable over time.
 *
 * Dutch is primary (NL restaurant focus); English is supported for non-NL or
 * bilingual runs. Cuisine/neighbourhood templates are only rendered when that
 * value is known, so prompts never contain empty placeholders.
 *
 * Complements the editable DB store (lib/engine/prompt-store.ts): this is the
 * typed, intent-tagged corpus; the store can override template strings per
 * business_type/language without a deploy.
 */

export type PromptIntent =
  | 'best_in_city'
  | 'cuisine_recommendation'
  | 'date_night'
  | 'group_dining'
  | 'local_favorite'
  | 'affordable'
  | 'lunch'
  | 'dinner'
  | 'dietary_vegetarian'
  | 'neighborhood'

export type PromptLanguage = 'nl' | 'en'

export interface PromptTemplate {
  intent: PromptIntent
  language: PromptLanguage
  /** Relative importance (1–100): cuisine/occasion queries are the winnable core;
   *  generic "best in city" is a lower-weight benchmark. */
  weight: number
  /** Placeholders: {city} {cuisine} {neighborhood}. */
  template: string
  /** Only rendered when the named value is present. */
  requires?: 'cuisine' | 'neighborhood'
}

export interface AuditPromptInput {
  city: string
  cuisine?: string | null
  neighborhood?: string | null
  language?: PromptLanguage
}

export interface RenderedAuditPrompt {
  id: string
  intent: PromptIntent
  language: PromptLanguage
  weight: number
  template: string
  rendered_prompt: string
  city: string
  cuisine: string | null
}

const WEIGHTS: Record<PromptIntent, number> = {
  cuisine_recommendation: 95,
  date_night: 82,
  group_dining: 80,
  neighborhood: 78,
  local_favorite: 74,
  dinner: 72,
  lunch: 70,
  affordable: 68,
  dietary_vegetarian: 66,
  best_in_city: 60, // generic benchmark / competitor-discovery
}

const NL_TEMPLATES: Array<Omit<PromptTemplate, 'language' | 'weight'>> = [
  { intent: 'best_in_city',           template: 'Wat zijn de beste restaurants in {city}?' },
  { intent: 'cuisine_recommendation', template: 'Welke {cuisine} restaurants in {city} worden vaak aangeraden?', requires: 'cuisine' },
  { intent: 'date_night',             template: 'Waar kan ik goed eten in {city} voor een date night?' },
  { intent: 'group_dining',           template: 'Welk restaurant in {city} is geschikt om met een groep te eten?' },
  { intent: 'local_favorite',         template: 'Wat zijn lokale favoriete restaurants in {city} onder bewoners?' },
  { intent: 'affordable',             template: 'Waar kun je betaalbaar uit eten in {city}?' },
  { intent: 'lunch',                  template: 'Waar kun je goed lunchen in {city}?' },
  { intent: 'dinner',                 template: 'Wat is een goed restaurant in {city} om te dineren?' },
  { intent: 'dietary_vegetarian',    template: 'Wat zijn de beste vegetarische restaurants in {city}?' },
  { intent: 'neighborhood',           template: 'Wat zijn goede restaurants in de buurt {neighborhood} in {city}?', requires: 'neighborhood' },
]

const EN_TEMPLATES: Array<Omit<PromptTemplate, 'language' | 'weight'>> = [
  { intent: 'best_in_city',           template: 'What are the best restaurants in {city}?' },
  { intent: 'cuisine_recommendation', template: 'What are the best restaurants in {city} for {cuisine}?', requires: 'cuisine' },
  { intent: 'date_night',             template: 'Where should I eat in {city} for a date night?' },
  { intent: 'group_dining',           template: 'Which restaurant in {city} is good for group dining?' },
  { intent: 'local_favorite',         template: 'What are the local favourite restaurants in {city}?' },
  { intent: 'affordable',             template: 'Where can I eat affordably in {city}?' },
  { intent: 'lunch',                  template: 'Where is a good place for lunch in {city}?' },
  { intent: 'dinner',                 template: 'What is a good restaurant for dinner in {city}?' },
  { intent: 'dietary_vegetarian',    template: 'What are the best vegetarian restaurants in {city}?' },
  { intent: 'neighborhood',           template: 'What are good restaurants in the {neighborhood} neighbourhood of {city}?', requires: 'neighborhood' },
]

function withMeta(
  rows: Array<Omit<PromptTemplate, 'language' | 'weight'>>,
  language: PromptLanguage,
): PromptTemplate[] {
  return rows.map((r) => ({ ...r, language, weight: WEIGHTS[r.intent] }))
}

/** The full corpus per language (intent-tagged, weighted). */
export const PROMPT_CORPUS: Record<PromptLanguage, PromptTemplate[]> = {
  nl: withMeta(NL_TEMPLATES, 'nl'),
  en: withMeta(EN_TEMPLATES, 'en'),
}

function render(template: string, input: AuditPromptInput): string {
  return template
    .replace(/\{city\}/g, input.city)
    .replace(/\{cuisine\}/g, input.cuisine ?? '')
    .replace(/\{neighborhood\}/g, input.neighborhood ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Render the stable audit prompt set for a restaurant. Deterministic: same input
 * → same prompts in the same order (weight desc, then intent name), so audits are
 * repeatable and comparable across re-runs. Templates that need a value the
 * restaurant doesn't have (cuisine/neighbourhood) are skipped.
 */
export function buildAuditPrompts(input: AuditPromptInput): RenderedAuditPrompt[] {
  const language: PromptLanguage = input.language ?? 'nl'
  const city = input.city.trim()
  const cuisine = input.cuisine?.trim() || null
  const neighborhood = input.neighborhood?.trim() || null

  const templates = PROMPT_CORPUS[language] ?? PROMPT_CORPUS.nl

  const usable = templates.filter((t) => {
    if (t.requires === 'cuisine') return !!cuisine
    if (t.requires === 'neighborhood') return !!neighborhood
    return true
  })

  return usable
    .slice()
    .sort((a, b) => b.weight - a.weight || a.intent.localeCompare(b.intent))
    .map((t, i) => ({
      id: `${language}-${t.intent}-${i + 1}`,
      intent: t.intent,
      language,
      weight: t.weight,
      template: t.template,
      rendered_prompt: render(t.template, { city, cuisine, neighborhood, language }),
      city,
      cuisine,
    }))
}
