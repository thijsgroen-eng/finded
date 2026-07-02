import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readCustomerSession, CUSTOMER_COOKIE } from '@/lib/auth/customer'
import { supabaseAdmin } from '@/lib/supabase/client'
import { createAudit } from '@/lib/engine/audit-runner'

export const dynamic = 'force-dynamic'

const SUBSCRIPTION_PLANS = ['monthly', 'starter', 'pro']

export async function POST(req: NextRequest) {
  const jar = await cookies()
  const session = await readCustomerSession(jar.get(CUSTOMER_COOKIE)?.value)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { restaurant_id } = await req.json()
  if (!restaurant_id) return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })

  // Verify the customer owns this restaurant
  const { data: link } = await supabaseAdmin
    .from('customer_restaurants')
    .select('id')
    .eq('customer_user_id', session.cid)
    .eq('restaurant_id', restaurant_id)
    .maybeSingle()

  if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Check the restaurant has a subscription plan
  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('plan')
    .eq('id', restaurant_id)
    .single()

  if (!restaurant || !SUBSCRIPTION_PLANS.includes(restaurant.plan ?? '')) {
    return NextResponse.json({ error: 'subscription_required' }, { status: 403 })
  }

  // Block if audit already running
  const { data: active } = await supabaseAdmin
    .from('audits')
    .select('id')
    .eq('restaurant_id', restaurant_id)
    .in('status', ['queued', 'running'])
    .limit(1)

  if (active && active.length > 0) {
    return NextResponse.json({ error: 'already_running' }, { status: 409 })
  }

  const auditId = await createAudit(restaurant_id, { source: 'manual' })
  return NextResponse.json({ auditId })
}
