import { NextRequest, NextResponse } from 'next/server'

/**
 * Verify a request to a cron-only endpoint.
 *
 * Accepts either an `x-cron-secret` header (used by the Supabase pg_cron job)
 * or an `Authorization: Bearer <secret>` header (set automatically by Vercel
 * Cron when CRON_SECRET is configured).
 *
 * Fails closed in production: if CRON_SECRET is not configured the endpoint is
 * unusable rather than silently public. In non-production it is allowed through
 * for local development convenience.
 *
 * Returns a NextResponse to short-circuit with when the request is rejected,
 * or null when the request is authorized.
 */
export function verifyCronRequest(request: NextRequest): NextResponse | null {
  const expected = process.env.CRON_SECRET

  if (!expected) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'CRON_SECRET is not configured' },
        { status: 503 }
      )
    }
    return null
  }

  const headerSecret = request.headers.get('x-cron-secret')
  const bearer = request.headers.get('authorization')
  const authorized = headerSecret === expected || bearer === `Bearer ${expected}`

  return authorized
    ? null
    : NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
