import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { normalizeCity, domainFromUrl } from '@/lib/engine/normalize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Admin-only (gated by middleware). Acts on public audit requests.

const ALLOWED_STATUS = new Set(['new_request', 'contacted', 'audit_created', 'archived'])

/** PATCH /api/admin/requests  { id, status } — set a request's status. */
export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const id = typeof body.id === 'string' ? body.id : null
  const status = typeof body.status === 'string' ? body.status : null

  if (!id || !status || !ALLOWED_STATUS.has(status)) {
    return NextResponse.json({ error: 'id and a valid status are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('audit_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

/**
 * POST /api/admin/requests  { id, action: 'create_audit' }
 * Turns a request into a real restaurant + queued audit (same path as
 * /api/detect), links them back onto the request, and marks it audit_created.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const id = typeof body.id === 'string' ? body.id : null
  if (!id || body.action !== 'create_audit') {
    return NextResponse.json({ error: 'id and action=create_audit required' }, { status: 400 })
  }

  const { data: req } = await supabaseAdmin
    .from('audit_requests').select('*').eq('id', id).single()
  if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

  try {
    const { detectBusiness } = await import('@/lib/engine/business-detector')
    const business = await detectBusiness(req.website).catch(() => null)

    // Prefer detected values, fall back to what the owner submitted.
    const name = business?.name || req.restaurant_name || req.domain || req.website
    const city = normalizeCity(business?.city || req.city) ?? (business?.city || req.city || 'Unknown')

    const { data: entity, error } = await supabaseAdmin
      .from('restaurants')
      .insert({
        name,
        website:       business?.website || req.website,
        domain:        domainFromUrl(business?.website || req.website) || req.domain,
        city,
        country:       business?.country || 'Netherlands',
        cuisine:       business?.subtypes?.[0] || null,
        business_type: business?.business_type || 'restaurant',
        subtypes:      business?.subtypes?.length ? business.subtypes : null,
      })
      .select()
      .single()

    if (error || !entity) throw new Error(error?.message ?? 'Failed to create restaurant')

    const { createAudit } = await import('@/lib/engine/audit-runner')
    const auditId = await createAudit(entity.id)

    await supabaseAdmin
      .from('audit_requests')
      .update({ restaurant_id: entity.id, audit_id: auditId, status: 'audit_created', updated_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({ ok: true, audit_id: auditId })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create audit' },
      { status: 500 },
    )
  }
}
