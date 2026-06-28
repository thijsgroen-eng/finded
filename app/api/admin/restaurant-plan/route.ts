import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { sessionFromRequest, logAdminAction } from '@/lib/auth/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/restaurant-plan  { restaurant_id, plan }  (admin-gated)
 * Sets a restaurant's dashboard tier (free | audit | implementation). Keeps the
 * legacy report_paid flag in sync (true for any paid tier).
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const restaurantId = typeof body.restaurant_id === 'string' ? body.restaurant_id : null
  const plan = body.plan
  if (!restaurantId || (plan !== 'free' && plan !== 'audit' && plan !== 'implementation')) {
    return NextResponse.json({ error: 'restaurant_id and plan (free|audit|implementation) required' }, { status: 400 })
  }
  // A paid plan also advances the prospecting pipeline to "customer".
  const patch: Record<string, unknown> = { plan, report_paid: plan !== 'free' }
  if (plan !== 'free') patch.prospect_status = 'customer'
  const { error } = await supabaseAdmin
    .from('restaurants')
    .update(patch)
    .eq('id', restaurantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAdminAction(await sessionFromRequest(request), 'plan.set', restaurantId, { plan })
  return NextResponse.json({ ok: true, plan })
}
