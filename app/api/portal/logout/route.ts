import { NextResponse } from 'next/server'
import { CUSTOMER_COOKIE } from '@/lib/auth/customer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST /api/portal/logout — clear the customer session. */
export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(CUSTOMER_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
