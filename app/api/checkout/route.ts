import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { createCheckoutSession } from '@/lib/payments/stripe'
import { asPlanKey } from '@/lib/payments/plans'

export const runtime = 'nodejs'

/**
 * POST /api/checkout  { restaurant_id?, slug?, plan? }
 * Creates a Stripe Checkout Session and returns { url }. Used by the admin
 * subscribe button (sends restaurant_id + plan).
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const plan = asPlanKey(body.plan)

  let restaurant: { id: string; preview_slug: string | null } | null = null
  if (typeof body.restaurant_id === 'string') {
    const { data } = await supabaseAdmin.from('restaurants').select('id, preview_slug').eq('id', body.restaurant_id).single()
    restaurant = data
  } else if (typeof body.slug === 'string') {
    const { data } = await supabaseAdmin.from('restaurants').select('id, preview_slug').eq('preview_slug', body.slug).single()
    restaurant = data
  }
  if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

  try {
    const url = await createCheckoutSession(
      { restaurantId: restaurant.id, slug: restaurant.preview_slug },
      plan,
      new URL(request.url).origin,
    )
    return NextResponse.json({ url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Checkout failed'
    return NextResponse.json({ error: msg }, { status: msg.includes('not configured') ? 503 : 500 })
  }
}
