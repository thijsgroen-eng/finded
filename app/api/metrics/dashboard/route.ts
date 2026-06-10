import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function GET() {
  const [
    { count: totalRestaurants },
    { count: totalAudits },
    { count: completedAudits },
    { count: queuedAudits },
    { count: runningAudits },
    { count: failedAudits },
    { data: recentAudits },
    { data: mentionStats },
  ] = await Promise.all([
    supabaseAdmin.from('restaurants').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('audits').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('audits').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabaseAdmin.from('audits').select('id', { count: 'exact', head: true }).eq('status', 'queued'),
    supabaseAdmin.from('audits').select('id', { count: 'exact', head: true }).eq('status', 'running'),
    supabaseAdmin.from('audits').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    supabaseAdmin
      .from('audits')
      .select('id, status, created_at, completed_at, restaurant:restaurants(name, city)')
      .order('created_at', { ascending: false })
      .limit(8),
    supabaseAdmin
      .from('mentions')
      .select('mentioned')
      .limit(10000),
  ])

  // Average mention frequency across all completed audits
  const totalMentionRows = mentionStats?.length ?? 0
  const totalMentioned = mentionStats?.filter((m) => m.mentioned).length ?? 0
  const avgMentionFrequency =
    totalMentionRows > 0
      ? Math.round((totalMentioned / totalMentionRows) * 100)
      : 0

  return NextResponse.json({
    restaurants:           totalRestaurants ?? 0,
    audits_total:          totalAudits ?? 0,
    audits_completed:      completedAudits ?? 0,
    audits_queued:         queuedAudits ?? 0,
    audits_running:        runningAudits ?? 0,
    audits_failed:         failedAudits ?? 0,
    avg_mention_frequency: avgMentionFrequency,
    recent_audits:         recentAudits ?? [],
  })
}
