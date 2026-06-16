import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { runAudit } from '@/lib/engine/audit-runner'
import { verifyCronRequest } from '@/lib/auth/cron'

const WORKER_ID = `worker-${process.pid}-${Date.now()}`

/**
 * POST /api/queue/process
 * Picks up the next queued audit and runs it.
 * Called by:
 * - Supabase cron job (every 2 minutes)
 * - Internal trigger after bulk upload
 * - Manual trigger from admin UI
 *
 * Protected by CRON_SECRET header.
 */
export async function POST(request: NextRequest) {
  const denied = verifyCronRequest(request)
  if (denied) return denied

  // Claim next available queue item (atomic-ish via update+select)
  const { data: claimed } = await supabaseAdmin
    .from('audit_queue')
    .update({ locked_at: new Date().toISOString(), locked_by: WORKER_ID })
    .is('locked_at', null)
    .lt('attempts', 3)
    .lte('scheduled_at', new Date().toISOString())
    .select('audit_id, attempts')
    .limit(1)
    .single()

  if (!claimed) {
    return NextResponse.json({ message: 'No audits in queue', processed: 0 })
  }

  const { audit_id, attempts } = claimed

  try {
    await runAudit(audit_id)
    return NextResponse.json({ message: 'Audit completed', audit_id, processed: 1 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    // Increment attempts and unlock so it can be retried — but not forever
    // (the claim query above skips rows once attempts reaches the cap).
    await supabaseAdmin
      .from('audit_queue')
      .update({ locked_at: null, locked_by: null, attempts: attempts + 1 })
      .eq('audit_id', audit_id)

    return NextResponse.json(
      { error: msg, audit_id },
      { status: 500 }
    )
  }
}

/**
 * GET /api/queue/process
 * Returns current queue status.
 */
export async function GET() {
  const { data: queued, count: queuedCount } = await supabaseAdmin
    .from('audit_queue')
    .select('audit_id, attempts, scheduled_at', { count: 'exact' })
    .is('locked_at', null)

  const { count: runningCount } = await supabaseAdmin
    .from('audits')
    .select('id', { count: 'exact' })
    .eq('status', 'running')

  return NextResponse.json({
    queued: queuedCount ?? 0,
    running: runningCount ?? 0,
    items: queued ?? [],
  })
}
