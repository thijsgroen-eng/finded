import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { getStripe } from '@/lib/payments/stripe'
import { PLANS, asPlanKey } from '@/lib/payments/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/stripe/webhook
 * On checkout.session.completed, grants report access and records the payment.
 * Fails closed: requires STRIPE_WEBHOOK_SECRET + a valid signature, so nobody can
 * forge a "paid" event.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const sig = request.headers.get('stripe-signature')
  if (!stripe || !secret || !sig) {
    return NextResponse.json({ error: 'Stripe webhook not configured' }, { status: 503 })
  }

  const raw = await request.text()
  let event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret)
  } catch (e) {
    return NextResponse.json({ error: `Invalid signature: ${e instanceof Error ? e.message : ''}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as {
      id: string; amount_total: number | null; metadata?: Record<string, string> | null
    }
    const restaurantId = s.metadata?.restaurant_id
    const plan = asPlanKey(s.metadata?.plan)

    if (!restaurantId) {
      console.error('Stripe webhook: missing restaurant_id in metadata', { sessionId: s.id })
    } else {
      if (PLANS[plan].grantsReport) {
        await supabaseAdmin.from('restaurants').update({ report_paid: true }).eq('id', restaurantId)
      }
      // Idempotent on stripe_session_id so webhook retries don't double-insert.
      await supabaseAdmin.from('payments').upsert({
        restaurant_id:     restaurantId,
        plan,
        mode:              PLANS[plan].mode,
        amount:            s.amount_total ?? PLANS[plan].amount,
        currency:          PLANS[plan].currency,
        stripe_session_id: s.id,
        status:            'paid',
      }, { onConflict: 'stripe_session_id' })
    }
  }

  return NextResponse.json({ received: true })
}
