import Stripe from 'stripe'
import { PLANS, PlanKey } from './plans'

/**
 * Lazily-constructed Stripe client. Returns null when STRIPE_SECRET_KEY is not
 * configured so callers can fail closed (503) instead of crashing at import.
 */
let _stripe: Stripe | null | undefined
export function getStripe(): Stripe | null {
  if (_stripe !== undefined) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  _stripe = key ? new Stripe(key) : null
  return _stripe
}

export interface CheckoutTarget {
  restaurantId: string
  slug: string | null
}

/**
 * Create a Stripe Checkout Session for a plan and return its hosted URL.
 * Amounts come from the PLANS catalog (inline price_data — no dashboard Price IDs).
 * Throws if Stripe isn't configured.
 */
export async function createCheckoutSession(
  target: CheckoutTarget,
  planKey: PlanKey,
  origin: string,
): Promise<string> {
  const stripe = getStripe()
  if (!stripe) throw new Error('Stripe is not configured')

  const plan = PLANS[planKey]
  const back = target.slug ? `${origin}/report/${target.slug}` : origin

  const session = await stripe.checkout.sessions.create({
    mode: plan.mode,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: plan.currency,
          unit_amount: plan.amount,
          product_data: { name: `Finded — ${plan.label}` },
          ...(plan.mode === 'subscription' ? { recurring: { interval: plan.interval ?? 'month' } } : {}),
        },
      },
    ],
    // restaurant_id is the join key the webhook uses to grant access.
    metadata: { restaurant_id: target.restaurantId, plan: plan.key, slug: target.slug ?? '' },
    success_url: `${back}?paid=1`,
    cancel_url: back,
  })

  if (!session.url) throw new Error('Stripe did not return a checkout URL')
  return session.url
}
