import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, passwordMatches, createSessionToken, type Session } from '@/lib/auth/admin'
import { authenticate, logAdminAction } from '@/lib/auth/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/login  { email?, password }
 * - With email: authenticate against an admin_users account (#9).
 * - Without email (or no such user): fall back to the shared ADMIN_PASSWORD,
 *   which logs in as a bootstrap admin — so existing usage is unchanged.
 * Issues a signed session cookie carrying the user id + role.
 */
export async function POST(request: NextRequest) {
  const haveSecret = !!(process.env.AUTH_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim())
  if (!haveSecret) {
    return NextResponse.json({ error: 'Admin login is not configured' }, { status: 503 })
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  let session: Session | null = null
  if (email) {
    session = await authenticate(email, password)
  } else if (passwordMatches(password)) {
    session = { uid: null, email: 'shared', role: 'admin' }
  }

  if (!session) {
    return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 })
  }

  const token = await createSessionToken(session)
  if (!token) {
    return NextResponse.json({ error: 'Admin login is not configured' }, { status: 503 })
  }

  await logAdminAction(session, 'login', session.email)

  const res = NextResponse.json({ ok: true, role: session.role, email: session.email })
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  return res
}

/** DELETE /api/admin/login — log out (clear the cookie). */
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
