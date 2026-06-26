import { NextResponse } from 'next/server'
import { backfillObservations } from '@/lib/observations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/admin/insights/backfill  (admin-gated)
 * Replays existing completed audits into the Observation Engine so the knowledge
 * base benefits from audits run before the engine existed. Idempotent.
 */
export async function POST() {
  const result = await backfillObservations()
  return NextResponse.json({ ok: true, ...result })
}
