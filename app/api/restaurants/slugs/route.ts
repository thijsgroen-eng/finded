import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

function generateSlug(name: string, id: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + id.slice(0, 8)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { restaurant_id } = body

  if (!restaurant_id) {
    return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })
  }

  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('id, name, preview_slug')
    .eq('id', restaurant_id)
    .single()

  if (!restaurant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Return existing slug if already has one
  if (restaurant.preview_slug) {
    return NextResponse.json({ slug: restaurant.preview_slug })
  }

  // Generate new slug
  const slug = generateSlug(restaurant.name, restaurant.id)

  await supabaseAdmin
    .from('restaurants')
    .update({ preview_slug: slug })
    .eq('id', restaurant_id)

  return NextResponse.json({ slug })
}

// Generate slugs for all restaurants that don't have one
export async function GET() {
  const { data: restaurants } = await supabaseAdmin
    .from('restaurants')
    .select('id, name')
    .is('preview_slug', null)

  if (!restaurants || restaurants.length === 0) {
    return NextResponse.json({ updated: 0 })
  }

  let updated = 0
  for (const r of restaurants) {
    const slug = generateSlug(r.name, r.id)
    await supabaseAdmin
      .from('restaurants')
      .update({ preview_slug: slug })
      .eq('id', r.id)
    updated++
  }

  return NextResponse.json({ updated })
}
