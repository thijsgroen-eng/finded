import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { createAudit } from '@/lib/engine/audit-runner'

/**
 * POST /api/monitoring/run
 * Finds all restaurants due for monitoring and triggers new audits.
 * Called by Vercel cron daily — only runs restaurants actually due.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find all monitoring schedules that are due
  const { data: due, error } = await supabaseAdmin
    .from('monitoring_schedules')
    .select('id, restaurant_id, frequency')
    .eq('status', 'active')
    .lte('next_run_at', new Date().toISOString())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!due || due.length === 0) {
    return NextResponse.json({ message: 'No restaurants due for monitoring', triggered: 0 })
  }

  const results: { restaurant_id: string; audit_id?: string; error?: string }[] = []

  for (const schedule of due) {
    try {
      // Check no audit is already running for this restaurant
      const { data: active } = await supabaseAdmin
        .from('audits')
        .select('id')
        .eq('restaurant_id', schedule.restaurant_id)
        .in('status', ['queued', 'running'])
        .limit(1)

      if (active && active.length > 0) {
        results.push({ restaurant_id: schedule.restaurant_id, error: 'Audit already running' })
        continue
      }

      // Trigger new audit
      const auditId = await createAudit(schedule.restaurant_id)

      // Calculate next run date
      const nextRun = new Date()
      if (schedule.frequency === 'weekly') {
        nextRun.setDate(nextRun.getDate() + 7)
      } else if (schedule.frequency === 'daily') {
        nextRun.setDate(nextRun.getDate() + 1)
      } else {
        nextRun.setMonth(nextRun.getMonth() + 1)
      }

      // Update schedule
      await supabaseAdmin
        .from('monitoring_schedules')
        .update({
          last_run_at: new Date().toISOString(),
          next_run_at: nextRun.toISOString(),
        })
        .eq('id', schedule.id)

      results.push({ restaurant_id: schedule.restaurant_id, audit_id: auditId })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      results.push({ restaurant_id: schedule.restaurant_id, error: msg })
    }
  }

  const triggered = results.filter(r => r.audit_id).length
  const failed = results.filter(r => r.error).length

  return NextResponse.json({
    message: `Monitoring run complete`,
    triggered,
    failed,
    results,
  })
}

/**
 * GET /api/monitoring/run
 * Returns monitoring schedule status.
 */
export async function GET() {
  const { data: schedules, count } = await supabaseAdmin
    .from('monitoring_schedules')
    .select(`
      id,
      restaurant_id,
      frequency,
      next_run_at,
      last_run_at,
      status,
      restaurant:restaurants(name, city)
    `, { count: 'exact' })
    .eq('status', 'active')
    .order('next_run_at', { ascending: true })

  const now = new Date()
  const overdue = schedules?.filter(s => s.next_run_at && new Date(s.next_run_at) < now).length ?? 0

  return NextResponse.json({
    total: count ?? 0,
    overdue,
    schedules: schedules ?? [],
  })
}
