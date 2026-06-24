import { NextRequest, NextResponse } from 'next/server'
import { buildReportPdf } from '@/lib/report/build'
import { ReportVariant, normalizeVariant } from '@/lib/report/report-document'
import { ADMIN_COOKIE, isValidSession, adminAuthDisabledInDev } from '@/lib/auth/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/report/[id]/pdf?lang=nl|en&plan=free|audit|implementation
 * (legacy ?variant=full|teaser still accepted). `id` is the audit id.
 *
 *  - free           → lead magnet (score, models, basic competitors, summary). PUBLIC.
 *  - audit          → the €49 detailed report. ADMIN ONLY.
 *  - implementation → the €299 action plan. ADMIN ONLY.
 *
 * Only the free plan is public; the paid plans carry the paid content, so they
 * require a valid admin session.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const url = new URL(request.url)
  const raw = url.searchParams.get('plan') || url.searchParams.get('variant') || 'free'
  const variant = (['free', 'audit', 'implementation', 'full', 'teaser'].includes(raw) ? raw : 'free') as ReportVariant
  const plan = normalizeVariant(variant)

  if (plan !== 'free' && !adminAuthDisabledInDev()) {
    const authed = await isValidSession(request.cookies.get(ADMIN_COOKIE)?.value)
    if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await buildReportPdf(id, variant, url.searchParams.get('lang'))
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return new NextResponse(result.buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${result.filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
