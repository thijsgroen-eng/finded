import { NextRequest, NextResponse } from 'next/server'
import { asLanguage } from '@/lib/i18n'
import { TEMPLATE_CATEGORIES, TemplateCategory } from '@/lib/engine/prompt-generator'
import {
  getTemplatesView,
  replaceCategoryTemplates,
  importDefaults,
  publishDrafts,
  discardDrafts,
  listPromptHistory,
  rollbackToVersion,
  diffVersion,
} from '@/lib/engine/prompt-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function asCategory(value: unknown): TemplateCategory | null {
  return (TEMPLATE_CATEGORIES as readonly string[]).includes(value as string)
    ? (value as TemplateCategory)
    : null
}

/**
 * GET /api/admin/prompts?business_type=&language=[&history=1|&diff=<version>]
 *  - default: editor view (defaults + published + pending drafts + version)
 *  - history=1: version history list
 *  - diff=<n>: per-category diff of version n vs current published
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const businessType = (url.searchParams.get('business_type') ?? 'restaurant').toLowerCase()
  const language = asLanguage(url.searchParams.get('language'))

  if (url.searchParams.get('history') === '1') {
    return NextResponse.json({ history: await listPromptHistory(businessType, language) })
  }
  const diffParam = url.searchParams.get('diff')
  if (diffParam) {
    const diff = await diffVersion(businessType, language, Number(diffParam))
    if (!diff) return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    return NextResponse.json({ diff })
  }
  return NextResponse.json(await getTemplatesView(businessType, language))
}

/**
 * PUT /api/admin/prompts { business_type, language, category, templates: string[] }
 * Saves a DRAFT for one category (does not affect live audits until published).
 */
export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const businessType = typeof body.business_type === 'string' ? body.business_type : 'restaurant'
  const language = asLanguage(typeof body.language === 'string' ? body.language : null)
  const category = asCategory(body.category)
  const templates = Array.isArray(body.templates)
    ? body.templates.filter((t: unknown): t is string => typeof t === 'string')
    : null

  if (!category) return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  if (!templates) return NextResponse.json({ error: 'templates must be an array' }, { status: 400 })

  await replaceCategoryTemplates(businessType, language, category, templates)
  return NextResponse.json(await getTemplatesView(businessType, language))
}

/**
 * POST /api/admin/prompts { business_type, language, action, ... }
 * actions: import_defaults | publish | discard | rollback (version)
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const businessType = typeof body.business_type === 'string' ? body.business_type : 'restaurant'
  const language = asLanguage(typeof body.language === 'string' ? body.language : null)
  const action = body.action

  if (action === 'import_defaults') {
    const result = await importDefaults(businessType, language)
    return NextResponse.json({ ...result, ...(await getTemplatesView(businessType, language)) })
  }
  if (action === 'publish') {
    const note = typeof body.note === 'string' ? body.note : undefined
    const result = await publishDrafts(businessType, language, note)
    return NextResponse.json({ ...result, ...(await getTemplatesView(businessType, language)) })
  }
  if (action === 'discard') {
    await discardDrafts(businessType, language)
    return NextResponse.json(await getTemplatesView(businessType, language))
  }
  if (action === 'rollback') {
    const version = Number(body.version)
    if (!Number.isFinite(version)) return NextResponse.json({ error: 'version required' }, { status: 400 })
    try {
      const result = await rollbackToVersion(businessType, language, version)
      return NextResponse.json({ ...result, ...(await getTemplatesView(businessType, language)) })
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Rollback failed' }, { status: 400 })
    }
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
