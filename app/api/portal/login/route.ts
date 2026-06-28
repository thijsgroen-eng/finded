import { NextRequest, NextResponse } from 'next/server'
import { createLoginToken } from '@/lib/auth/customer'
import { sendEmail, customerMagicLinkEmail } from '@/lib/email/send'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/portal/login  { email }
 * Emails a one-time magic link. Always returns ok (no account enumeration).
 */
export async function POST(request: NextRequest) {
  if (!(process.env.AUTH_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim())) {
    return NextResponse.json({ error: 'Login is not configured' }, { status: 503 })
  }
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  }

  const token = await createLoginToken(email)
  const url = `${request.nextUrl.origin}/api/portal/verify?token=${token}`
  await sendEmail({ to: email, ...customerMagicLinkEmail({ url }) })

  return NextResponse.json({ ok: true })
}
