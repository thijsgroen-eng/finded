import { supabaseAdmin } from '@/lib/supabase/client'

/**
 * Create an audit record and dispatch it to the Inngest pipeline
 * (lib/inngest/audit-function.ts), which is the single audit engine.
 *
 * If the Inngest event can't be sent (e.g. transient outage), the audit is
 * parked in `audit_queue`; the cron worker at /api/queue/process re-dispatches
 * it to Inngest. Returns the new audit ID.
 */
export async function createAudit(restaurantId: string): Promise<string> {
  const { data: audit, error } = await supabaseAdmin
    .from('audits')
    .insert({ restaurant_id: restaurantId, status: 'queued' })
    .select('id')
    .single()

  if (error || !audit) throw new Error(`Failed to create audit: ${error?.message}`)

  try {
    const { inngest } = await import('@/lib/inngest/client')
    await inngest.send({
      name: 'audit/requested',
      data: { audit_id: audit.id, restaurant_id: restaurantId },
    })
  } catch (err) {
    console.error('[createAudit] Inngest send failed, parking in queue:', err)
    await supabaseAdmin.from('audit_queue').insert({ audit_id: audit.id })
  }

  return audit.id
}
