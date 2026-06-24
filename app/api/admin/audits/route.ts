import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Admin-only (gated by middleware). Rerun or stop an audit.

/**
 * POST /api/admin/audits  { audit_id, action: 'rerun' | 'stop' }
 *  - rerun: queue a fresh audit for the same restaurant (returns the new id).
 *  - stop:  mark a queued/running audit cancelled and remove it from the queue.
 *           The pipeline checks this flag between prompts and bails out.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const auditId = typeof body.audit_id === 'string' ? body.audit_id : null
  const action = body.action

  if (!auditId || (action !== 'rerun' && action !== 'stop')) {
    return NextResponse.json({ error: 'audit_id and action (rerun|stop) required' }, { status: 400 })
  }

  const { data: audit } = await supabaseAdmin
    .from('audits').select('id, restaurant_id, status').eq('id', auditId).single()
  if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 })

  if (action === 'stop') {
    await supabaseAdmin
      .from('audits')
      .update({ status: 'cancelled', error_message: 'Stopped by operator', completed_at: new Date().toISOString() })
      .eq('id', auditId)
      .in('status', ['queued', 'running'])
    await supabaseAdmin.from('audit_queue').delete().eq('audit_id', auditId)
    return NextResponse.json({ ok: true })
  }

  // rerun
  if (!audit.restaurant_id) {
    return NextResponse.json({ error: 'Audit has no restaurant to re-run' }, { status: 400 })
  }
  try {
    const { createAudit } = await import('@/lib/engine/audit-runner')
    const newId = await createAudit(audit.restaurant_id)
    return NextResponse.json({ ok: true, audit_id: newId })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to re-run' }, { status: 500 })
  }
}
