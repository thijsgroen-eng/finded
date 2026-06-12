import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
})

const PLANS = {
  starter: {
    name: 'Finded Starter',
    price: 9900, // €99 in cents
    interval: 'month' as const,
    description: 'Monthly AI visibility audit + monitoring',
  },
  pro: {
    name: 'Finded Pro',
    price: 29900, // €299 in cents
    interval: 'month' as const,
    description: 'Up to 5 locations + competitor intel',
  },
}

export async function POST(request: NextRequest) {
  const { restaurant_id, plan = 'starter', success_path, cancel_path } = await request.json()

  if (!restaurant_id) {
    return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })
  }

  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('id, name, email')
    .eq('id', restaurant_id)
    .single()

  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
  }

  const planConfig = PLANS[plan as keyof typeof PLANS] ?? PLANS.starter

  const origin = request.headers.get('origin') ?? 'https://finded.vercel.app'

  try {
    // Create or retrieve Stripe product
    const product = await stripe.products.create({
      name: planConfig.name,
      metadata: { plan },
    })

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: planConfig.price,
      currency: 'eur',
      recurring: { interval: planConfig.interval },
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: price.id, quantity: 1 }],
      customer_email: restaurant.email || undefined,
      success_url: `${origin}${success_path ?? '/admin/dashboard'}?checkout=success&restaurant_id=${restaurant_id}`,
      cancel_url: `${origin}${cancel_path ?? `/admin/audits`}?checkout=cancelled`,
      metadata: {
        restaurant_id,
        plan,
      },
      subscription_data: {
        metadata: {
          restaurant_id,
          plan,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout' },
      { status: 500 }
    )
  }
}
