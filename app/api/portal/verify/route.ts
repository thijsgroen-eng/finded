import { NextRequest, NextResponse } from 'next/server'
import { consumeLoginToken, resolveCustomerOnLogin, createCustomerSession, CUSTOMER_COOKIE, cookieMaxAge } from '@/lib/auth/customer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/portal/verify?token=…  (clicked from the magic-link email)
 * Consumes the token, links the owner's restaurants, sets the session cookie,
 * and redirects to the dashboard. Invalid/expired → back to login with a notice.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? ''
  const base = request.nextUrl.origin

  const email = token ? await consumeLoginToken(token) : null
  if (!email) {
    return NextResponse.redirect(`${base}/portal/login?error=expired`)
  }

  const session = await resolveCustomerOnLogin(email)
  const cookie = await createCustomerSession(session)
  if (!cookie) return NextResponse.redirect(`${base}/portal/login?error=config`)

  const res = NextResponse.redirect(`${base}/dashboard`)
  res.cookies.set(CUSTOMER_COOKIE, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: cookieMaxAge,
  })
  return res
}
