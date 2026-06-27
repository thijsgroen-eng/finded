import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PROSPECT_STATUSES = [
  'not_audited', 'audit_queued', 'audit_complete', 'outreach_ready', 'contacted', 'customer', 'monitoring',
]

/**
 * PATCH /api/admin/restaurants/[id]  (admin-gated)
 * Update the CRM / prospecting fields on a single restaurant: prospect_status,
 * tags, internal_notes, next_follow_up. Only known fields are accepted.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const patch: Record<string, unknown> = {}

  if (typeof body.prospect_status === 'string') {
    if (!PROSPECT_STATUSES.includes(body.prospect_status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    patch.prospect_status = body.prospect_status
  }
  if ('tags' in body) {
    patch.tags = Array.isArray(body.tags)
      ? (body.tags as unknown[]).map(String).map((s) => s.trim()).filter(Boolean)
      : null
  }
  if ('internal_notes' in body) {
    patch.internal_notes = typeof body.internal_notes === 'string' && body.internal_notes.trim()
      ? body.internal_notes : null
  }
  if ('next_follow_up' in body) {
    patch.next_follow_up = typeof body.next_follow_up === 'string' && body.next_follow_up.trim()
      ? body.next_follow_up : null
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('restaurants')
    .update(patch)
    .eq('id', id)
    .select('id, prospect_status, tags, internal_notes, next_follow_up')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}
