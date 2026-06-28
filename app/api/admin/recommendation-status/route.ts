import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { sessionFromRequest, logAdminAction } from '@/lib/auth/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/recommendation-status { id, status }  (admin-gated)
 * Sets a recommendation's status. Marking it 'implemented' stamps implemented_at
 * (today) so the warehouse can measure its impact against the next audit.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const id = typeof body.id === 'string' ? body.id : ''
  const status = body.status
  if (!id || (status !== 'pending' && status !== 'implemented' && status !== 'archived')) {
    return NextResponse.json({ error: 'id and status (pending|implemented|archived) required' }, { status: 400 })
  }
  const patch: Record<string, unknown> = { status }
  if (status === 'implemented') patch.implemented_at = new Date().toISOString().slice(0, 10)
  const { error } = await supabaseAdmin.from('recommendations').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAdminAction(await sessionFromRequest(request), 'recommendation.status', id, { status })
  return NextResponse.json({ ok: true })
}
