import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { sendEmail, dashboardInviteEmail } from '@/lib/email/send'
import { sessionFromRequest, logAdminAction } from '@/lib/auth/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/send-invite  { restaurant_id }  (admin-gated by middleware)
 * Operator-triggered: emails the restaurant's owner a "your dashboard is ready —
 * log in" invite. Deliberately manual (not automatic) so prospects you're still
 * auditing are never cold-emailed.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const id = typeof body.restaurant_id === 'string' ? body.restaurant_id : ''
  if (!id) return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })

  const { data: r } = await supabaseAdmin.from('restaurants').select('name, email').eq('id', id).maybeSingle()
  if (!r) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
  if (!r.email) return NextResponse.json({ error: 'This restaurant has no contact email on file' }, { status: 400 })

  const loginUrl = `${request.nextUrl.origin}/portal/login`
  const mail = dashboardInviteEmail({ restaurantName: r.name, loginUrl })
  const res = await sendEmail({ to: r.email, subject: mail.subject, html: mail.html, text: mail.text })
  if (!res.sent) {
    return NextResponse.json({ error: res.skipped ? 'Email is not configured (set RESEND_API_KEY)' : (res.error ?? 'Send failed') }, { status: 502 })
  }

  await logAdminAction(await sessionFromRequest(request), 'invite.sent', id, { to: r.email })
  return NextResponse.json({ ok: true, to: r.email })
}
