import { NextRequest, NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/admin/me — the current admin session (for the UI). */
export async function GET(request: NextRequest) {
  const session = await sessionFromRequest(request)
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 })
  return NextResponse.json({ authenticated: true, email: session.email, role: session.role, uid: session.uid })
}
