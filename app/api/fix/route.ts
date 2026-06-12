import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { inngest } from '@/lib/inngest/client'

export async function POST(request: NextRequest) {
  const { recommendation_id } = await request.json()

  if (!recommendation_id) {
    return NextResponse.json({ error: 'recommendation_id required' }, { status: 400 })
  }

  const { data: rec } = await supabaseAdmin
    .from('recommendations')
    .select('*, restaurant:restaurants(*), audit:audits(*)')
    .eq('id', recommendation_id)
    .single()

  if (!rec) {
    return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 })
  }

  // Mark as generating
  await supabaseAdmin
    .from('recommendations')
    .update({ status: 'generating' })
    .eq('id', recommendation_id)

  // Trigger Inngest job
  await inngest.send({
    name: 'fix/requested',
    data: {
      recommendation_id,
      restaurant_id: rec.restaurant_id,
      audit_id: rec.audit_id,
      fix_type: rec.type,
    },
  })

  return NextResponse.json({ success: true, status: 'generating' })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const recommendation_id = searchParams.get('recommendation_id')
  const restaurant_id = searchParams.get('restaurant_id')

  if (recommendation_id) {
    const { data } = await supabaseAdmin
      .from('generated_assets')
      .select('*')
      .eq('recommendation_id', recommendation_id)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({ asset: data ?? null })
  }

  if (restaurant_id) {
    const { data } = await supabaseAdmin
      .from('generated_assets')
      .select('*')
      .eq('restaurant_id', restaurant_id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ assets: data ?? [] })
  }

  return NextResponse.json({ error: 'recommendation_id or restaurant_id required' }, { status: 400 })
}
