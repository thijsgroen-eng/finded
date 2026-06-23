import { NextRequest, NextResponse } from 'next/server'
import { asLanguage } from '@/lib/i18n'
import {
  TEMPLATE_CATEGORIES,
  TemplateCategory,
} from '@/lib/engine/prompt-generator'
import {
  getTemplatesView,
  replaceCategoryTemplates,
  importDefaults,
} from '@/lib/engine/prompt-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function asCategory(value: unknown): TemplateCategory | null {
  return (TEMPLATE_CATEGORIES as readonly string[]).includes(value as string)
    ? (value as TemplateCategory)
    : null
}

/**
 * GET /api/admin/prompts?business_type=restaurant&language=nl
 * Returns the code defaults + current operator overrides for the editor.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const businessType = (url.searchParams.get('business_type') ?? 'restaurant').toLowerCase()
  const language = asLanguage(url.searchParams.get('language'))
  const view = await getTemplatesView(businessType, language)
  return NextResponse.json(view)
}

/**
 * PUT /api/admin/prompts  { business_type, language, category, templates: string[] }
 * Replaces the override rows for one category. Empty `templates` resets it to the
 * code default.
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
  const view = await getTemplatesView(businessType, language)
  return NextResponse.json(view)
}

/**
 * POST /api/admin/prompts  { business_type, language, action: 'import_defaults' }
 * Seeds the override table from the shipped corpus so it can be edited.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const businessType = typeof body.business_type === 'string' ? body.business_type : 'restaurant'
  const language = asLanguage(typeof body.language === 'string' ? body.language : null)

  if (body.action !== 'import_defaults') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const result = await importDefaults(businessType, language)
  const view = await getTemplatesView(businessType, language)
  return NextResponse.json({ ...result, ...view })
}
