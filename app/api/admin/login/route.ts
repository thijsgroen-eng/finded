import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, passwordMatches, expectedToken } from '@/lib/auth/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/login  { password }
 * Sets the admin session cookie on a correct password. Fails closed (503) if
 * ADMIN_PASSWORD is not configured, so the gate is never accidentally open.
 */
export async function POST(request: NextRequest) {
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Admin login is not configured' }, { status: 503 })
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const password = typeof body.password === 'string' ? body.password : ''

  if (!passwordMatches(password)) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const token = await expectedToken()
  if (!token) {
    return NextResponse.json({ error: 'Admin login is not configured' }, { status: 503 })
  }

  const res = NextResponse.json({ ok: true })
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
