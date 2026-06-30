import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { inngest } from '@/lib/inngest/client'
import { asFixType } from '@/lib/engine/fix-types'
import { buildRunAccounting } from '@/lib/engine/audit-evidence'
import { reliabilityFromAccounting } from '@/lib/audit/reliability'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/prepare-implementation  { audit_id }   (admin-gated)
 * Queues generation of every fix asset the implementation package needs but
 * doesn't have yet — one per fix type, from the audit's recommendations. Async
 * (Inngest fix-function); the assets land in generated_assets and then appear in
 * the implementation PDF. Returns how many were queued vs already present.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const auditId = typeof body.audit_id === 'string' ? body.audit_id : null
  if (!auditId) return NextResponse.json({ error: 'audit_id required' }, { status: 400 })

  const [{ data: recs }, { data: assets }, { data: audit }] = await Promise.all([
    supabaseAdmin.from('recommendations').select('id, type, asset_type, restaurant_id').eq('audit_id', auditId),
    supabaseAdmin.from('generated_assets').select('type').eq('audit_id', auditId),
    supabaseAdmin.from('audits').select('restaurant_id').eq('id', auditId).single(),
  ])

  if (!recs || recs.length === 0) {
    return NextResponse.json({ error: 'No recommendations to generate from — generate recommendations first.' }, { status: 409 })
  }

  // Reliability gate: don't build an implementation package on an audit that
  // didn't clear the minimum share of successful model calls.
  const { data: relRuns } = await supabaseAdmin
    .from('model_runs').select('model, raw_response, status').eq('audit_id', auditId)
  const reliability = reliabilityFromAccounting(buildRunAccounting((relRuns ?? []) as any[]))
  if (!reliability.allow.recommendations) {
    return NextResponse.json(
      { error: `Audit reliability too low to build an implementation package. ${reliability.detail} Re-run the audit first.`, reliability },
      { status: 422 },
    )
  }

  const existingTypes = new Set((assets ?? []).map((a) => a.type))
  const restaurantId = audit?.restaurant_id ?? recs.find((r) => r.restaurant_id)?.restaurant_id ?? null

  if (!restaurantId) {
    return NextResponse.json({ error: 'Could not determine restaurant_id for this audit.' }, { status: 422 })
  }

  let queued = 0
  const requested = new Set<string>()
  for (const r of recs) {
    const fixType = asFixType(r.asset_type) ?? asFixType(r.type)
    if (!fixType || existingTypes.has(fixType) || requested.has(fixType)) continue
    requested.add(fixType)
    await inngest.send({
      name: 'fix/requested',
      data: { recommendation_id: r.id, restaurant_id: restaurantId, audit_id: auditId, fix_type: fixType },
    })
    await supabaseAdmin.from('recommendations').update({ status: 'generating' }).eq('id', r.id)
    queued++
  }

  return NextResponse.json({ ok: true, queued, alreadyHave: existingTypes.size })
}
