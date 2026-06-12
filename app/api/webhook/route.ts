import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
})

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.CheckoutSession
        const restaurant_id = session.metadata?.restaurant_id
        const plan = session.metadata?.plan ?? 'starter'

        if (!restaurant_id) break

        // Upsert customer
        await supabaseAdmin.from('customers').upsert({
          restaurant_id,
          stripe_customer_id: session.customer as string,
          email: session.customer_email ?? '',
          plan,
          status: 'active',
          stripe_subscription_id: session.subscription as string,
          subscribed_at: new Date().toISOString(),
        }, { onConflict: 'restaurant_id' })

        // Schedule monthly monitoring
        const nextRun = new Date()
        nextRun.setMonth(nextRun.getMonth() + 1)

        await supabaseAdmin.from('monitoring_schedules').upsert({
          restaurant_id,
          frequency: plan === 'pro' ? 'weekly' : 'monthly',
          next_run_at: nextRun.toISOString(),
          status: 'active',
        }, { onConflict: 'restaurant_id' })

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const restaurant_id = subscription.metadata?.restaurant_id

        if (!restaurant_id) break

        await supabaseAdmin
          .from('customers')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('restaurant_id', restaurant_id)

        await supabaseAdmin
          .from('monitoring_schedules')
          .update({ status: 'paused' })
          .eq('restaurant_id', restaurant_id)

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscription_id = invoice.subscription as string

        if (!subscription_id) break

        await supabaseAdmin
          .from('customers')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subscription_id)

        break
      }
    }
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
