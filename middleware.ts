import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, isValidSession, adminAuthDisabledInDev } from '@/lib/auth/admin'

/**
 * Gate the admin surface. Covers:
 *   - all /admin pages (except the login page)
 *   - all admin-only API routes (everything under /api EXCEPT the public set:
 *     report, checkout, stripe webhook, inngest, and the cron endpoints which
 *     carry their own CRON_SECRET auth)
 *
 * Unauthenticated page requests redirect to /admin/login?next=…; API requests
 * get a 401. Fails closed in production when ADMIN_PASSWORD is unset.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith('/api/')

  // The login API must stay reachable so a user can authenticate. (The /login
  // page itself is outside the matcher.)
  if (pathname === '/api/admin/login') {
    return NextResponse.next()
  }

  // Dev convenience: no password configured locally → allow through.
  if (adminAuthDisabledInDev()) return NextResponse.next()

  const ok = await isValidSession(request.cookies.get(ADMIN_COOKIE)?.value)
  if (ok) return NextResponse.next()

  if (isApi) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.search = ''
  if (pathname !== '/admin') url.searchParams.set('next', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/admin/:path*',
    // All API routes except the public ones. The cron endpoints (queue,
    // monitoring) carry their own CRON_SECRET auth; report/checkout/stripe/
    // inngest and the public audit-request funnel are intentionally public.
    '/api/((?!report|checkout|stripe|inngest|queue|monitoring|audit-request|portal).*)',
  ],
}
