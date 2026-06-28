/**
 * App settings — operator-configurable defaults, persisted in the app_settings
 * singleton row (migration 018). Server-only (uses the service-role client).
 *
 * Adding a setting: extend AppSettings + DEFAULT_SETTINGS + coerce(). Everything
 * else (API route, admin form) is generic over the object.
 */

import { supabaseAdmin } from '@/lib/supabase/client'
import { languageForCountry, Language } from '@/lib/i18n'

export interface AppSettings {
  /** Default language for reports/audits when not otherwise specified. */
  defaultLanguage: Language
  /** Always use defaultLanguage, ignoring the restaurant's country. */
  forceLanguage: boolean
  /** Public contact email shown on the site. */
  contactEmail: string
  /** Founder first name shown in the site's human/founder section. */
  founderName: string
  /** Which AI providers audits may use. A provider with no API key is excluded
   *  regardless; this lets the operator switch a configured provider off too. */
  providers: { openai: boolean; anthropic: boolean; gemini: boolean; perplexity: boolean }
  /** Live web-search grounding during audits. Off ≈ ~10× cheaper (no search fees). */
  grounded: boolean
  /** Max prompts per audit (cost scales linearly). */
  maxPrompts: number
  /** Samples per (prompt, model). 1 is plenty; higher multiplies cost. */
  samples: number
  /** Cost controls (#10). Estimated price per model call, in euro cents, used for
   *  the up-front cost estimate and the daily spend ledger. */
  groundedCallCents: number
  ungroundedCallCents: number
  /** Hard daily spend cap in euro cents. 0 = no cap (disabled). */
  dailyBudgetCents: number
  /** Per-provider-call timeout in ms (a hung provider no longer blocks its cohort). */
  providerTimeoutMs: number
  /** Adaptive execution (#5): when ON, providers run sequentially per prompt and
   *  stop early once the target is mentioned by enough of them — cheaper, but it
   *  changes outputs (fewer models = thinner consensus + observations), so it is
   *  OFF by default and meant for cheap re-checks, not billed audits. */
  adaptiveExecution: boolean
  /** Stop a prompt's providers early once this many have mentioned the target. */
  adaptiveStopOnMentions: number
}

export type ProviderKey = keyof AppSettings['providers']

// Clients are mostly Dutch, so default to Dutch everywhere out of the box.
export const DEFAULT_SETTINGS: AppSettings = {
  defaultLanguage: 'nl',
  forceLanguage: true,
  contactEmail: 'Info@finded.com',
  founderName: 'Thijs',
  providers: { openai: true, anthropic: true, gemini: true, perplexity: true },
  grounded: true,
  maxPrompts: 32,
  samples: 1,
  // Cost controls. Cap is OFF by default (0) so behaviour is unchanged until an
  // operator sets a budget. Per-call price is a rough grounding-fee estimate.
  groundedCallCents: 4,
  ungroundedCallCents: 1,
  dailyBudgetCents: 0,
  providerTimeoutMs: 90000,
  adaptiveExecution: false,   // full matrix by default — preserves behaviour + the moat
  adaptiveStopOnMentions: 2,
}

/** Validate/normalize a raw stored object into a full AppSettings. */
function coerce(raw: unknown): AppSettings {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const p = (d.providers && typeof d.providers === 'object' ? d.providers : {}) as Record<string, unknown>
  return {
    defaultLanguage: d.defaultLanguage === 'en' ? 'en' : d.defaultLanguage === 'nl' ? 'nl' : DEFAULT_SETTINGS.defaultLanguage,
    forceLanguage: typeof d.forceLanguage === 'boolean' ? d.forceLanguage : DEFAULT_SETTINGS.forceLanguage,
    contactEmail: typeof d.contactEmail === 'string' && d.contactEmail.trim() ? d.contactEmail.trim() : DEFAULT_SETTINGS.contactEmail,
    founderName: typeof d.founderName === 'string' && d.founderName.trim() ? d.founderName.trim() : DEFAULT_SETTINGS.founderName,
    providers: {
      openai: (p.openai ?? true) !== false,
      anthropic: (p.anthropic ?? true) !== false,
      gemini: (p.gemini ?? true) !== false,
      perplexity: (p.perplexity ?? true) !== false,
    },
    grounded: typeof d.grounded === 'boolean' ? d.grounded : DEFAULT_SETTINGS.grounded,
    maxPrompts: typeof d.maxPrompts === 'number' && d.maxPrompts >= 1 ? Math.min(64, Math.floor(d.maxPrompts)) : DEFAULT_SETTINGS.maxPrompts,
    samples: typeof d.samples === 'number' && d.samples >= 1 ? Math.min(5, Math.floor(d.samples)) : DEFAULT_SETTINGS.samples,
    groundedCallCents: typeof d.groundedCallCents === 'number' && d.groundedCallCents >= 0 ? d.groundedCallCents : DEFAULT_SETTINGS.groundedCallCents,
    ungroundedCallCents: typeof d.ungroundedCallCents === 'number' && d.ungroundedCallCents >= 0 ? d.ungroundedCallCents : DEFAULT_SETTINGS.ungroundedCallCents,
    dailyBudgetCents: typeof d.dailyBudgetCents === 'number' && d.dailyBudgetCents >= 0 ? Math.floor(d.dailyBudgetCents) : DEFAULT_SETTINGS.dailyBudgetCents,
    providerTimeoutMs: typeof d.providerTimeoutMs === 'number' && d.providerTimeoutMs >= 5000 ? Math.floor(d.providerTimeoutMs) : DEFAULT_SETTINGS.providerTimeoutMs,
    adaptiveExecution: typeof d.adaptiveExecution === 'boolean' ? d.adaptiveExecution : DEFAULT_SETTINGS.adaptiveExecution,
    adaptiveStopOnMentions: typeof d.adaptiveStopOnMentions === 'number' && d.adaptiveStopOnMentions >= 1 ? Math.min(4, Math.floor(d.adaptiveStopOnMentions)) : DEFAULT_SETTINGS.adaptiveStopOnMentions,
  }
}

/** Read the current settings (falls back to defaults if the table/row is absent). */
export async function getSettings(): Promise<AppSettings> {
  try {
    const { data } = await supabaseAdmin.from('app_settings').select('data').eq('id', 1).maybeSingle()
    return coerce(data?.data)
  } catch {
    return DEFAULT_SETTINGS
  }
}

/** Merge a partial patch over current settings and persist. Returns the result. */
export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings()
  const next = coerce({ ...current, ...patch })
  await supabaseAdmin.from('app_settings').upsert({ id: 1, data: next, updated_at: new Date().toISOString() })
  return next
}

/**
 * Resolve the language for an audit/report given the restaurant's country and the
 * operator's settings. forceLanguage → always the default; otherwise country
 * decides (with the configured default as the fallback for unknown countries).
 */
export async function resolveAuditLanguage(country?: string | null): Promise<Language> {
  const s = await getSettings()
  if (s.forceLanguage) return s.defaultLanguage
  if (!country) return s.defaultLanguage
  return languageForCountry(country)
}
