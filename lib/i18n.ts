/**
 * Shared, dependency-free language layer. Imported by both server engine code
 * (prompt generation, outreach) and client components, so it must have NO
 * server-only imports.
 *
 * The product targets Netherlands restaurants first, so Dutch is the default for
 * NL/BE; everything else falls back to English. English stays available for the
 * later "any website, any country" generalization.
 */

export type Language = 'nl' | 'en'

export const LANGUAGES: Language[] = ['nl', 'en']

export const LANGUAGE_LABELS: Record<Language, string> = {
  nl: 'Nederlands',
  en: 'English',
}

export const DEFAULT_LANGUAGE: Language = 'en'

const DUTCH_COUNTRIES = new Set([
  'netherlands', 'nederland', 'the netherlands', 'nl', 'holland',
  'belgium', 'belgië', 'belgie', 'be',
])

/** Pick the audit/report language for a business based on its country. */
export function languageForCountry(country?: string | null): Language {
  if (!country) return DEFAULT_LANGUAGE
  return DUTCH_COUNTRIES.has(country.trim().toLowerCase()) ? 'nl' : DEFAULT_LANGUAGE
}

/** Normalize an arbitrary value to a supported Language, falling back to default. */
export function asLanguage(value?: string | null): Language {
  return value === 'nl' || value === 'en' ? value : DEFAULT_LANGUAGE
}

/** Full language name in English, for prompting an LLM to respond in it. */
export const LANGUAGE_NAME_EN: Record<Language, string> = {
  nl: 'Dutch',
  en: 'English',
}
