import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { writeWarehouseForAudit } from '@/lib/warehouse/write'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/admin/warehouse/backfill  { limit?, offset? }  (admin-gated)
 * Idempotent replay of completed audits into the V2 warehouse. Run repeatedly
 * (paging via offset) until `scanned` < `limit`. Safe — re-running replaces only
 * each audit's own rows.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const limit = Math.min(500, Math.max(1, Number(body.limit ?? 200)))
  const offset = Math.max(0, Number(body.offset ?? 0))

  const { data: audits, error } = await supabaseAdmin
    .from('audits').select('id').eq('status', 'completed')
    .order('created_at', { ascending: true }).range(offset, offset + limit - 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let written = 0, skipped = 0, failed = 0
  for (const a of audits ?? []) {
    try { const r = await writeWarehouseForAudit(a.id); if (r) written++; else skipped++ }
    catch { failed++ }
  }
  const scanned = (audits ?? []).length
  return NextResponse.json({ scanned, written, skipped, failed, nextOffset: offset + scanned, done: scanned < limit })
}
