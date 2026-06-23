import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { createCheckoutSession } from '@/lib/payments/stripe'
import { asPlanKey } from '@/lib/payments/plans'

export const runtime = 'nodejs'

/**
 * GET /checkout?slug=...&plan=...
 * Public entry the report's unlock buttons link to: creates a Checkout Session
 * and redirects to Stripe. On failure (e.g. Stripe not configured) it redirects
 * back to the report rather than 404-ing.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug')
  const plan = asPlanKey(url.searchParams.get('plan'))
  const origin = url.origin

  if (!slug) return NextResponse.redirect(`${origin}/`)

  const { data: restaurant } = await supabaseAdmin
    .from('restaurants').select('id, preview_slug').eq('preview_slug', slug).single()
  if (!restaurant) return NextResponse.redirect(`${origin}/`)

  try {
    const checkoutUrl = await createCheckoutSession(
      { restaurantId: restaurant.id, slug: restaurant.preview_slug }, plan, origin,
    )
    return NextResponse.redirect(checkoutUrl)
  } catch {
    return NextResponse.redirect(`${origin}/report/${slug}?error=checkout_unavailable`)
  }
}
