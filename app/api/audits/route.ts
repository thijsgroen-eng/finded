import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { createAudit } from '@/lib/engine/audit-runner'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status      = searchParams.get('status')
  const restaurantId = searchParams.get('restaurant_id')
  const page        = parseInt(searchParams.get('page') ?? '1', 10)
  const limit       = Math.min(parseInt(searchParams.get('limit') ?? '25', 10), 100)
  const offset      = (page - 1) * limit

  let query = supabaseAdmin
    .from('audits')
    .select(`
      *,
      restaurant:restaurants(id, name, city, cuisine)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (restaurantId) query = query.eq('restaurant_id', restaurantId)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data,
    meta: { total: count ?? 0, page, limit },
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { restaurant_id } = body

  if (!restaurant_id) {
    return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })
  }

  // Check restaurant exists
  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('id, name')
    .eq('id', restaurant_id)
    .single()

  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
  }

  // Check for already-running audit
  const { data: running } = await supabaseAdmin
    .from('audits')
    .select('id')
    .eq('restaurant_id', restaurant_id)
    .in('status', ['queued', 'running'])
    .limit(1)

  if (running && running.length > 0) {
    return NextResponse.json(
      { error: 'An audit is already in progress for this restaurant' },
      { status: 409 }
    )
  }

  const auditId = await createAudit(restaurant_id)

  return NextResponse.json({ data: { audit_id: auditId } }, { status: 201 })
}
