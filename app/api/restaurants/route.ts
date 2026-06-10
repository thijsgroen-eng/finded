import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('q') ?? ''
  const city   = searchParams.get('city') ?? ''
  const page   = parseInt(searchParams.get('page') ?? '1', 10)
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100)
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('restaurants')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,website.ilike.%${search}%`
    )
  }
  if (city) {
    query = query.ilike('city', `%${city}%`)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data,
    meta: { total: count ?? 0, page, limit },
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, website, city, cuisine, email, phone } = body

  if (!name || !city) {
    return NextResponse.json(
      { error: 'name and city are required' },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('restaurants')
    .insert({ name, website, city, cuisine, email, phone })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
