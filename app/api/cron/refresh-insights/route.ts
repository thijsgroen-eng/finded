import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { verifyCronRequest } from '@/lib/auth/cron'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/cron/refresh-insights — refresh the warehouse materialized views.
 * Protected by CRON_SECRET. Schedule hourly/daily. No-op-safe before 030 applied.
 */
export async function POST(request: NextRequest) {
  const denied = verifyCronRequest(request)
  if (denied) return denied
  const { error } = await supabaseAdmin.rpc('refresh_warehouse_mvs')
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, refreshed_at: new Date().toISOString() })
}
