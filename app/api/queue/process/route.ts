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
    // Increment attempts and unlock so it can be retried — but not forever
    // (the claim query above skips rows once attempts reaches the cap).
    await supabaseAdmin
      .from('audit_queue')
      .update({ locked_at: null, locked_by: null, attempts: attempts + 1 })
      .eq('audit_id', audit_id)

    return NextResponse.json({ error: msg, audit_id }, { status: 500 })
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
