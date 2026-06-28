import { NextRequest, NextResponse } from 'next/server'
import { getSettings, updateSettings, AppSettings } from '@/lib/settings'
import { sessionFromRequest, logAdminAction } from '@/lib/auth/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/admin/settings → current settings (admin-gated by middleware). */
export async function GET() {
  return NextResponse.json({ settings: await getSettings() })
}

/** POST /api/admin/settings { ...patch } → merge + persist, returns new settings. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const patch: Partial<AppSettings> = {}
  if (body.defaultLanguage === 'nl' || body.defaultLanguage === 'en') patch.defaultLanguage = body.defaultLanguage
  if (typeof body.forceLanguage === 'boolean') patch.forceLanguage = body.forceLanguage
  if (typeof body.contactEmail === 'string') patch.contactEmail = body.contactEmail
  if (typeof body.founderName === 'string') patch.founderName = body.founderName
  if (body.providers && typeof body.providers === 'object') patch.providers = body.providers as AppSettings['providers']
  if (typeof body.grounded === 'boolean') patch.grounded = body.grounded
  if (typeof body.maxPrompts === 'number') patch.maxPrompts = body.maxPrompts
  if (typeof body.samples === 'number') patch.samples = body.samples
  // Cost controls (#10)
  if (typeof body.groundedCallCents === 'number') patch.groundedCallCents = body.groundedCallCents
  if (typeof body.ungroundedCallCents === 'number') patch.ungroundedCallCents = body.ungroundedCallCents
  if (typeof body.dailyBudgetCents === 'number') patch.dailyBudgetCents = body.dailyBudgetCents
  if (typeof body.providerTimeoutMs === 'number') patch.providerTimeoutMs = body.providerTimeoutMs
  if (typeof body.adaptiveExecution === 'boolean') patch.adaptiveExecution = body.adaptiveExecution
  if (typeof body.adaptiveStopOnMentions === 'number') patch.adaptiveStopOnMentions = body.adaptiveStopOnMentions
  const settings = await updateSettings(patch)
  await logAdminAction(await sessionFromRequest(request), 'settings.update', null, { fields: Object.keys(patch) })
  return NextResponse.json({ ok: true, settings })
}
