import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { inngest } from '@/lib/inngest/client'
import { verifyCronRequest } from '@/lib/auth/cron'

const WORKER_ID = `worker-${process.pid}-${Date.now()}`

/**
 * POST /api/queue/process
 *
 * Drains the fallback queue. `audit_queue` only holds audits whose initial
 * Inngest dispatch failed (see createAudit), so this worker re-dispatches the
 * claimed audit to the single Inngest pipeline rather than running a separate
 * engine. Inngest owns execution + retries and removes the queue row when the
 * audit completes.
 *
 * Called by the Supabase pg_cron job / Vercel Cron. Protected by CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const denied = verifyCronRequest(request)
  if (denied) return denied

  // Claim next due queue item (atomic-ish via update+select). Only 'queued' rows
  // whose backoff window (next_retry_at) has elapsed and that haven't hit the cap.
  const now = new Date().toISOString()
  const { data: claimed } = await supabaseAdmin
    .from('audit_queue')
    .update({ locked_at: now, locked_by: WORKER_ID, status: 'processing' })
    .is('locked_at', null)
    .eq('status', 'queued')
    .lt('attempts', 3)
    .lte('next_retry_at', now)
    .select('audit_id, attempts, max_attempts')
    .limit(1)
    .single()

  if (!claimed) {
    return NextResponse.json({ message: 'No audits in queue', processed: 0 })
  }

  const { audit_id, attempts } = claimed
  const maxAttempts = claimed.max_attempts ?? 3

  // Look up the restaurant the audit belongs to so we can build the event.
  const { data: audit } = await supabaseAdmin
    .from('audits')
    .select('restaurant_id')
    .eq('id', audit_id)
    .single()

  if (!audit) {
    // Orphaned queue row — drop it.
    await supabaseAdmin.from('audit_queue').delete().eq('audit_id', audit_id)
    return NextResponse.json({ message: 'Orphaned queue item removed', audit_id, processed: 0 })
  }

  try {
    await inngest.send({
      name: 'audit/requested',
      data: { audit_id, restaurant_id: audit.restaurant_id },
    })

    // Hand-off complete. Remove the queue row so the cron doesn't dispatch a
    // duplicate run; the Inngest function deletes it on completion as well.
    await supabaseAdmin.from('audit_queue').delete().eq('audit_id', audit_id)

    return NextResponse.json({ message: 'Audit dispatched to Inngest', audit_id, processed: 1 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    const nextAttempts = attempts + 1
    const { emitEvent } = await import('@/lib/audit/events')

    if (nextAttempts >= maxAttempts) {
      // Terminal failure — stop retrying forever. Mark the job failed and surface
      // it on the audit so it doesn't sit on 'queued'/'running' with no explanation.
      await supabaseAdmin
        .from('audit_queue')
        .update({ locked_at: null, locked_by: null, attempts: nextAttempts, status: 'failed', last_error: msg.slice(0, 500) })
        .eq('audit_id', audit_id)
      await supabaseAdmin
        .from('audits')
        .update({ status: 'failed', error_message: `Queue dispatch failed after ${nextAttempts} attempts: ${msg}`.slice(0, 500), completed_at: new Date().toISOString() })
        .eq('id', audit_id)
      await emitEvent(audit_id, 'audit.failed', { data: { stage: 'queue', attempts: nextAttempts } })
      return NextResponse.json({ error: msg, audit_id, terminal: true }, { status: 500 })
    }

    // Exponential backoff: 1m, 2m, 4m … capped at 1h. Unlock for a later retry.
    const delayMs = Math.min(60 * 60_000, 60_000 * 2 ** attempts)
    await supabaseAdmin
      .from('audit_queue')
      .update({
        locked_at: null, locked_by: null, attempts: nextAttempts, status: 'queued',
        last_error: msg.slice(0, 500), next_retry_at: new Date(Date.now() + delayMs).toISOString(),
      })
      .eq('audit_id', audit_id)

    return NextResponse.json({ error: msg, audit_id, retry_in_ms: delayMs }, { status: 500 })
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
