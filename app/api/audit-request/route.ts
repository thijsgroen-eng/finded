import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { validateAuditRequest } from '@/lib/leads/audit-request'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/audit-request  (PUBLIC)
 * Accepts a restaurant owner's audit request from the /audit funnel, validates +
 * sanitizes it, and stores it as an unqualified lead (status 'new_request',
 * source 'public_audit_request') via the service-role client.
 *
 * Security posture:
 *  - Writes only; never reads or returns existing restaurants/audits/reports.
 *  - Returns a constant `{ ok: true }` on success — no internal IDs, and no
 *    signal about whether the restaurant already exists in our data.
 *  - Honeypot + per-email soft rate limit for basic abuse protection.
 *  - Never creates an admin session.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const result = validateAuditRequest(body)

  // Honeypot tripped → look successful to the bot, store nothing.
  if (result.spam) return NextResponse.json({ ok: true })

  if (!result.ok || !result.cleaned) {
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 })
  }

  const c = result.cleaned

  try {
    // Soft rate limit: cap how many requests one email can file per hour.
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await supabaseAdmin
      .from('audit_requests')
      .select('id', { count: 'exact', head: true })
      .eq('email', c.email)
      .gte('created_at', since)

    if ((count ?? 0) >= 10) {
      // Don't reveal the limit or store more; the user still sees success.
      return NextResponse.json({ ok: true })
    }

    await supabaseAdmin.from('audit_requests').insert({
      website:         c.website,
      domain:          c.domain,
      restaurant_name: c.restaurant_name,
      city:            c.city,
      email:           c.email,
      phone:           c.phone,
      note:            c.note,
      source:          'public_audit_request',
      status:          'new_request',
    })
  } catch {
    // Don't leak internals; surface a generic, retryable error.
    return NextResponse.json(
      { ok: false, error: 'Could not submit right now. Please try again.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
