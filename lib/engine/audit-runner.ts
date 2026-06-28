import { supabaseAdmin } from '@/lib/supabase/client'

/** Optional reliability-test tagging so K audits can be grouped + compared later. */
export interface AuditOptions {
  reliabilityGroup?: string
  runIndex?: number
}

/**
 * Create an audit record and dispatch it to the Inngest pipeline
 * (lib/inngest/audit-function.ts), which is the single audit engine.
 *
 * If the Inngest event can't be sent (e.g. transient outage), the audit is
 * parked in `audit_queue`; the cron worker at /api/queue/process re-dispatches
 * it to Inngest. Returns the new audit ID.
 *
 * Pass `options.reliabilityGroup` to tag the audit as part of a reliability-test
 * group (see /api/reliability-test). The columns are only written when a group is
 * given, so normal audits don't depend on migration 007.
 */
export async function createAudit(restaurantId: string, options: AuditOptions = {}): Promise<string> {
  const insertData: Record<string, unknown> = { restaurant_id: restaurantId, status: 'queued' }
  if (options.reliabilityGroup) {
    insertData.reliability_group = options.reliabilityGroup
    insertData.reliability_run_index = options.runIndex ?? null
  }

  const { data: audit, error } = await supabaseAdmin
    .from('audits')
    .insert(insertData)
    .select('id')
    .single()

  if (error || !audit) throw new Error(`Failed to create audit: ${error?.message}`)

  // Timeline (#3): record creation. Best-effort, never blocks audit creation.
  const { emitEvent } = await import('@/lib/audit/events')
  await emitEvent(audit.id, 'audit.created', { data: { restaurant_id: restaurantId } })

  try {
    const { inngest } = await import('@/lib/inngest/client')
    await inngest.send({
      // Pin the event id to the (unique) audit id so K reliability runs are never
      // deduplicated/collapsed by Inngest into one cached run.
      id: `audit-${audit.id}`,
      name: 'audit/requested',
      data: {
        audit_id: audit.id,
        restaurant_id: restaurantId,
        ...(options.reliabilityGroup
          ? { reliability_group: options.reliabilityGroup, run_index: options.runIndex ?? null }
          : {}),
      },
    })
  } catch (err) {
    console.error('[createAudit] Inngest send failed, parking in queue:', err)
    await supabaseAdmin.from('audit_queue').insert({
      audit_id: audit.id,
      job_type: 'audit',
      status: 'queued',
      payload: { audit_id: audit.id, restaurant_id: restaurantId },
      last_error: err instanceof Error ? err.message.slice(0, 500) : 'inngest send failed',
      next_retry_at: new Date().toISOString(),
    })
    await emitEvent(audit.id, 'audit.queued', { data: { reason: 'inngest_send_failed' } })
  }

  return audit.id
}
