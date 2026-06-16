import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { computeMetrics } from '@/lib/engine/metrics'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: audit, error } = await supabaseAdmin
    .from('audits')
    .select(`*, restaurant:restaurants(*)`)
    .eq('id', id)
    .single()

  if (error || !audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
  }

  // Website audit
  const { data: websiteAudit } = await supabaseAdmin
    .from('website_audits')
    .select('*')
    .eq('audit_id', id)
    .single()

  // Mentions
  const { data: mentions } = await supabaseAdmin
    .from('mentions')
    .select('model, prompt_id, mentioned, mention_frequency, position, sentiment')
    .eq('audit_id', id)

  // Compute metrics
  const metrics = computeMetrics(mentions ?? [])

  // Model run count for each model
  const { data: runCounts } = await supabaseAdmin
    .from('model_runs')
    .select('model')
    .eq('audit_id', id)

  const runCountByModel: Record<string, number> = {}
  for (const r of runCounts ?? []) {
    runCountByModel[r.model] = (runCountByModel[r.model] ?? 0) + 1
  }

  return NextResponse.json({
    data: {
      audit,
      website_audit: websiteAudit,
      metrics,
      run_count_by_model: runCountByModel,
    },
  })
}
