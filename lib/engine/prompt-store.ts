/**
 * DB-backed prompt store.
 *
 * The prompt corpus is defined in code (prompt-generator.ts) and optionally
 * OVERRIDDEN per (business_type, language, category) by rows in the
 * `prompt_templates` table (migration 011). This module is the only place that
 * reads/writes that table, keeping prompt-generator.ts pure and client-safe.
 *
 * Resolution: load the code default set, overlay any enabled DB rows, generate.
 * If the table is empty or unreachable, the code defaults are used unchanged.
 */

import { supabaseAdmin } from '@/lib/supabase/client'
import { Language } from '@/lib/i18n'
import {
  TemplateSet,
  TemplateCategory,
  TEMPLATE_CATEGORIES,
  selectTemplate,
  mergeTemplateRows,
  getQuickPrompts,
  getFullPrompts,
  type GeneratedPrompt,
  type BusinessProfile,
} from './prompt-generator'

type TemplateRow = { category: string; template: string; sort_order: number }

/** Enabled override rows for a (business_type, language), sorted for stable order. */
async function fetchRows(businessType: string, language: Language): Promise<TemplateRow[]> {
  const { data, error } = await supabaseAdmin
    .from('prompt_templates')
    .select('category, template, sort_order')
    .eq('business_type', businessType.toLowerCase())
    .eq('language', language)
    .eq('enabled', true)
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

/**
 * The effective template set for a business: code defaults with any DB overrides
 * overlaid. Never throws — falls back to code defaults if the table is missing or
 * the query fails, so a misconfigured DB can't break audits.
 */
export async function loadTemplateSet(
  businessType: string,
  language: Language,
): Promise<TemplateSet> {
  const base = selectTemplate(businessType.toLowerCase(), language)
  try {
    const rows = await fetchRows(businessType, language)
    return mergeTemplateRows(base, rows)
  } catch {
    return base
  }
}

/** Quick prompt set, with the operator's template overrides applied. */
export async function getQuickPromptsFromStore(
  businessName: string,
  businessType: string,
  location: string,
  country: string,
  subtype: string | undefined,
  subtypes: string[] | undefined,
  language: Language,
): Promise<GeneratedPrompt[]> {
  const override = await loadTemplateSet(businessType, language)
  return getQuickPrompts(
    businessName, businessType, location, country, subtype, subtypes, language, override,
  )
}

/** Full prompt set (the complete corpus, e.g. the 32-prompt restaurant set), with overrides applied. */
export async function getFullPromptsFromStore(
  businessName: string,
  businessType: string,
  location: string,
  country: string,
  subtype: string | undefined,
  subtypes: string[] | undefined,
  language: Language,
): Promise<GeneratedPrompt[]> {
  const override = await loadTemplateSet(businessType, language)
  const profile: BusinessProfile = {
    name: businessName,
    businessType: businessType.toLowerCase(),
    subtypes: subtypes ?? (subtype ? [subtype] : []),
    location,
    country,
    language,
  }
  return getFullPrompts(profile, override)
}

// ── Admin editing helpers ─────────────────────────────────────────────────────

export type PromptTemplatesView = {
  business_type: string
  language: Language
  /** Code defaults per category (read-only reference for the editor). */
  defaults: TemplateSet
  /** Operator overrides per category (empty array = no override → default applies). */
  overrides: Record<TemplateCategory, string[]>
}

/** Snapshot for the admin editor: code defaults + current overrides side by side. */
export async function getTemplatesView(
  businessType: string,
  language: Language,
): Promise<PromptTemplatesView> {
  const defaults = selectTemplate(businessType.toLowerCase(), language)
  const overrides = Object.fromEntries(
    TEMPLATE_CATEGORIES.map((c) => [c, [] as string[]]),
  ) as Record<TemplateCategory, string[]>

  try {
    const rows = await fetchRows(businessType, language)
    for (const r of rows) {
      if ((TEMPLATE_CATEGORIES as readonly string[]).includes(r.category)) {
        overrides[r.category as TemplateCategory].push(r.template)
      }
    }
  } catch {
    // No table / unreachable → no overrides; editor shows defaults only.
  }

  return { business_type: businessType.toLowerCase(), language, defaults, overrides }
}

/**
 * Replace the override rows for one (business_type, language, category).
 * - Non-empty `templates` → that category is overridden by exactly these lines.
 * - Empty `templates`     → overrides removed → the code default applies again.
 * Operates as delete-then-insert so the stored set always matches the input.
 */
export async function replaceCategoryTemplates(
  businessType: string,
  language: Language,
  category: TemplateCategory,
  templates: string[],
): Promise<void> {
  const bt = businessType.toLowerCase()
  const cleaned = templates.map((t) => t.trim()).filter(Boolean)

  await supabaseAdmin
    .from('prompt_templates')
    .delete()
    .eq('business_type', bt)
    .eq('language', language)
    .eq('category', category)

  if (cleaned.length === 0) return

  await supabaseAdmin.from('prompt_templates').insert(
    cleaned.map((template, i) => ({
      business_type: bt,
      language,
      category,
      template,
      sort_order: i,
    })),
  )
}

/**
 * Seed the override table from the current code defaults for a (type, language),
 * so an operator can start editing from the shipped corpus. Skips categories that
 * already have overrides so it never clobbers operator edits.
 */
export async function importDefaults(
  businessType: string,
  language: Language,
): Promise<{ imported: number }> {
  const defaults = selectTemplate(businessType.toLowerCase(), language)
  const existing = await fetchRows(businessType, language)
  const haveCategory = new Set(existing.map((r) => r.category))

  let imported = 0
  for (const category of TEMPLATE_CATEGORIES) {
    if (haveCategory.has(category)) continue
    const lines = defaults[category]
    if (!lines.length) continue
    await replaceCategoryTemplates(businessType, language, category, lines)
    imported += lines.length
  }
  return { imported }
}
