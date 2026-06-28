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

/** Enabled, PUBLISHED override rows for a (business_type, language). This is the
 *  audit path — drafts are never live until published (#7). */
async function fetchRows(businessType: string, language: Language): Promise<TemplateRow[]> {
  const { data, error } = await supabaseAdmin
    .from('prompt_templates')
    .select('category, template, sort_order')
    .eq('business_type', businessType.toLowerCase())
    .eq('language', language)
    .eq('enabled', true)
    .eq('status', 'published')
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

// ── Admin editing helpers: draft / publish / history / rollback (#7) ───────────
//
// Model: prompt_templates rows carry a status — 'published' (what audits read)
// or 'draft' (pending edits). Operators edit drafts, then Publish promotes them
// (snapshotting the prior published set to prompt_template_history so it can be
// rolled back or diffed). Audits are never affected until a publish.

type EditorRow = { category: string; template: string; sort_order: number; status: string }

function emptyByCategory(): Record<TemplateCategory, string[]> {
  return Object.fromEntries(TEMPLATE_CATEGORIES.map((c) => [c, [] as string[]])) as Record<TemplateCategory, string[]>
}

/** All override rows (draft + published) for a (business_type, language). */
async function fetchEditorRows(businessType: string, language: Language): Promise<EditorRow[]> {
  const { data, error } = await supabaseAdmin
    .from('prompt_templates')
    .select('category, template, sort_order, status')
    .eq('business_type', businessType.toLowerCase())
    .eq('language', language)
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []) as EditorRow[]
}

export type PromptTemplatesView = {
  business_type: string
  language: Language
  /** Code defaults per category (read-only reference). */
  defaults: TemplateSet
  /** Live (published) overrides per category. */
  published: Record<TemplateCategory, string[]>
  /** Pending draft overrides per category (only for edited categories). */
  drafts: Record<TemplateCategory, string[]>
  hasDrafts: boolean
  version: number
}

async function currentVersion(businessType: string, language: Language): Promise<number> {
  const { data } = await supabaseAdmin
    .from('prompt_template_history')
    .select('version')
    .eq('business_type', businessType.toLowerCase())
    .eq('language', language)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.version ?? 0
}

/** Editor snapshot: defaults + live published + pending drafts, side by side. */
export async function getTemplatesView(
  businessType: string,
  language: Language,
): Promise<PromptTemplatesView> {
  const bt = businessType.toLowerCase()
  const defaults = selectTemplate(bt, language)
  const published = emptyByCategory()
  const drafts = emptyByCategory()
  let hasDrafts = false
  let version = 0

  try {
    const rows = await fetchEditorRows(bt, language)
    for (const r of rows) {
      if (!(TEMPLATE_CATEGORIES as readonly string[]).includes(r.category)) continue
      const cat = r.category as TemplateCategory
      if (r.status === 'draft') { drafts[cat].push(r.template); hasDrafts = true }
      else published[cat].push(r.template)
    }
    version = await currentVersion(bt, language)
  } catch {
    // No table / unreachable → editor shows defaults only.
  }

  return { business_type: bt, language, defaults, published, drafts, hasDrafts, version }
}

/**
 * Save a DRAFT for one category (delete-then-insert of that category's drafts).
 * Empty `templates` clears the draft for that category. Never touches published
 * rows, so audits are unaffected until Publish.
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
    .eq('business_type', bt).eq('language', language).eq('category', category).eq('status', 'draft')

  if (cleaned.length === 0) return
  await supabaseAdmin.from('prompt_templates').insert(
    cleaned.map((template, i) => ({ business_type: bt, language, category, template, sort_order: i, status: 'draft' })),
  )
}

/** Discard all pending drafts for a (business_type, language). */
export async function discardDrafts(businessType: string, language: Language): Promise<void> {
  await supabaseAdmin
    .from('prompt_templates')
    .delete()
    .eq('business_type', businessType.toLowerCase()).eq('language', language).eq('status', 'draft')
}

/** The published override set as { category: [templates] } (for history snapshots). */
async function publishedSnapshot(businessType: string, language: Language): Promise<Record<string, string[]>> {
  const rows = await fetchRows(businessType, language)
  const map: Record<string, string[]> = {}
  for (const r of rows) (map[r.category] ??= []).push(r.template)
  return map
}

async function snapshotHistory(businessType: string, language: Language, note: string): Promise<number> {
  const bt = businessType.toLowerCase()
  const snapshot = await publishedSnapshot(bt, language)
  const version = (await currentVersion(bt, language)) + 1
  await supabaseAdmin.from('prompt_template_history').insert({ business_type: bt, language, version, note, snapshot })
  return version
}

/** Replace the entire published set for (bt, lang) from a { category: [templates] } map. */
async function writePublishedSet(businessType: string, language: Language, set: Record<string, string[]>): Promise<void> {
  const bt = businessType.toLowerCase()
  await supabaseAdmin.from('prompt_templates').delete()
    .eq('business_type', bt).eq('language', language).eq('status', 'published')
  const rows: { business_type: string; language: Language; category: string; template: string; sort_order: number; status: string }[] = []
  for (const [category, templates] of Object.entries(set)) {
    templates.map((t) => t.trim()).filter(Boolean).forEach((template, i) =>
      rows.push({ business_type: bt, language, category, template, sort_order: i, status: 'published' }))
  }
  if (rows.length) await supabaseAdmin.from('prompt_templates').insert(rows)
}

/**
 * Publish pending drafts. Snapshots the current published set to history, then —
 * for each category that has drafts — replaces its published rows with the draft
 * rows. Categories with no draft are left as-is. Returns the new version.
 */
export async function publishDrafts(businessType: string, language: Language, note?: string): Promise<{ version: number; published: number }> {
  const bt = businessType.toLowerCase()
  const all = await fetchEditorRows(bt, language)
  const draftRows = all.filter((r) => r.status === 'draft')
  if (draftRows.length === 0) return { version: await currentVersion(bt, language), published: 0 }

  const version = await snapshotHistory(bt, language, note || `Published ${draftRows.length} change(s)`)

  // Rebuild the published map: keep untouched categories, override edited ones with drafts.
  const draftCats = new Set(draftRows.map((r) => r.category))
  const set: Record<string, string[]> = {}
  for (const r of all) {
    if (draftCats.has(r.category)) { if (r.status === 'draft') (set[r.category] ??= []).push(r.template) }
    else if (r.status === 'published') (set[r.category] ??= []).push(r.template)
  }
  await writePublishedSet(bt, language, set)
  await discardDrafts(bt, language)
  await supabaseAdmin.from('prompt_templates').update({ version }).eq('business_type', bt).eq('language', language).eq('status', 'published')
  return { version, published: draftRows.length }
}

/** History list (newest first) for the editor. */
export async function listPromptHistory(businessType: string, language: Language): Promise<{ version: number; note: string | null; created_at: string }[]> {
  const { data } = await supabaseAdmin
    .from('prompt_template_history')
    .select('version, note, created_at')
    .eq('business_type', businessType.toLowerCase()).eq('language', language)
    .order('version', { ascending: false })
  return data ?? []
}

async function historySnapshot(businessType: string, language: Language, version: number): Promise<Record<string, string[]> | null> {
  const { data } = await supabaseAdmin
    .from('prompt_template_history')
    .select('snapshot')
    .eq('business_type', businessType.toLowerCase()).eq('language', language).eq('version', version)
    .maybeSingle()
  return (data?.snapshot as Record<string, string[]> | undefined) ?? null
}

/** Roll the published set back to a historical version (itself snapshotted first). */
export async function rollbackToVersion(businessType: string, language: Language, version: number): Promise<{ version: number }> {
  const bt = businessType.toLowerCase()
  const snap = await historySnapshot(bt, language, version)
  if (!snap) throw new Error(`No prompt history version ${version}`)
  const newVersion = await snapshotHistory(bt, language, `Rolled back to v${version}`)
  await writePublishedSet(bt, language, snap)
  await supabaseAdmin.from('prompt_templates').update({ version: newVersion }).eq('business_type', bt).eq('language', language).eq('status', 'published')
  return { version: newVersion }
}

/** Per-category diff of a historical version against the current published set. */
export async function diffVersion(businessType: string, language: Language, version: number): Promise<{ category: string; historical: string[]; current: string[] }[] | null> {
  const snap = await historySnapshot(businessType, language, version)
  if (!snap) return null
  const current = await publishedSnapshot(businessType, language)
  const cats = new Set([...Object.keys(snap), ...Object.keys(current)])
  return [...cats].sort().map((category) => ({
    category, historical: snap[category] ?? [], current: current[category] ?? [],
  }))
}

/**
 * Seed DRAFTS from the code defaults for a (type, language) so an operator can
 * start editing from the shipped corpus, then review and Publish. Skips
 * categories that already have a draft so it never clobbers pending edits.
 */
export async function importDefaults(
  businessType: string,
  language: Language,
): Promise<{ imported: number }> {
  const defaults = selectTemplate(businessType.toLowerCase(), language)
  const existing = await fetchEditorRows(businessType, language)
  const haveDraft = new Set(existing.filter((r) => r.status === 'draft').map((r) => r.category))

  let imported = 0
  for (const category of TEMPLATE_CATEGORIES) {
    if (haveDraft.has(category)) continue
    const lines = defaults[category]
    if (!lines.length) continue
    await replaceCategoryTemplates(businessType, language, category, lines)
    imported += lines.length
  }
  return { imported }
}
