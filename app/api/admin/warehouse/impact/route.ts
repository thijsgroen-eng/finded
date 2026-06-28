import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { annotateRecommendationImpact } from '@/lib/warehouse/impact'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** POST /api/admin/warehouse/impact — back-annotate recommendation impact, then
 *  refresh the impact view. Admin-gated. */
export async function POST() {
  const result = await annotateRecommendationImpact()
  try { await supabaseAdmin.rpc('refresh_warehouse_mvs') } catch { /* refresh best-effort */ }
  return NextResponse.json({ ok: true, ...result })
}
