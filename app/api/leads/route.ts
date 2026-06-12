import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { restaurant_id, status, notes, next_followup_at } = body

  if (!restaurant_id) {
    return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('lead_statuses')
    .upsert(
      {
        restaurant_id,
        status,
        notes,
        next_followup_at,
        last_contacted_at: ['email_sent', 'replied', 'demo_scheduled'].includes(status)
          ? new Date().toISOString()
          : undefined,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'restaurant_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
