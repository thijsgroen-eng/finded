import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST /api/admin/warehouse/refresh — refresh the warehouse MVs (admin-gated). */
export async function POST() {
  const { error } = await supabaseAdmin.rpc('refresh_warehouse_mvs')
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
