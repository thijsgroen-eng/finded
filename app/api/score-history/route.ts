import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const restaurant_id = searchParams.get('restaurant_id')

  if (!restaurant_id) {
    return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('score_history')
    .select('snapshot_date, visibility_score, opportunity_score, mention_frequency, model_consensus, total_mentions')
    .eq('restaurant_id', restaurant_id)
    .order('snapshot_date', { ascending: true })
    .limit(12)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ history: data ?? [] })
}
