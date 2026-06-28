import { NextRequest, NextResponse } from 'next/server'
import { requireRole, listAuditLog } from '@/lib/auth/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/admin/audit-log — recent admin actions (admin only). */
export async function GET(request: NextRequest) {
  const guard = await requireRole(request, 'admin')
  if (guard instanceof NextResponse) return guard
  return NextResponse.json({ entries: await listAuditLog(200) })
}
