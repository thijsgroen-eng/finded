import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { clientHealth } from '@/lib/crm/health'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/clients  (admin-gated by middleware)
 * The client CRM: restaurants that are customers (paid plan or customer/monitoring
 * status), enriched with their portal account (signed-up / last-active), audit
 * count, latest score, and a computed health score.
 */
export async function GET() {
  const { data: rows, error } = await supabaseAdmin
    .from('restaurant_overview')
    .select('id, name, city, cuisine, email, plan, report_paid, prospect_status, visibility_score, last_audit_at, audit_count, created_at')
    .or('plan.in.(audit,implementation),report_paid.eq.true,prospect_status.in.(customer,monitoring)')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Portal accounts, keyed by email (signed-up + last-active).
  const { data: users } = await supabaseAdmin.from('customer_users').select('email, created_at, last_login_at')
  const byEmail = new Map<string, { created_at: string; last_login_at: string | null }>()
  for (const u of users ?? []) if (u.email) byEmail.set(u.email.toLowerCase(), { created_at: u.created_at, last_login_at: u.last_login_at })

  const now = Date.now()
  const clients = (rows ?? []).map((r: any) => {
    const acct = r.email ? byEmail.get(String(r.email).toLowerCase()) : undefined
    const plan = r.plan === 'implementation' ? 'implementation' : (r.plan === 'audit' || r.report_paid) ? 'audit' : 'free'
    const health = clientHealth({
      plan, auditCount: r.audit_count ?? 0, visibilityScore: r.visibility_score,
      lastAuditAt: r.last_audit_at, lastLoginAt: acct?.last_login_at ?? null, now,
    })
    return {
      id: r.id, name: r.name, city: r.city, cuisine: r.cuisine, email: r.email,
      plan, prospect_status: r.prospect_status,
      added_at: r.created_at,
      signed_up_at: acct?.created_at ?? null,
      last_active_at: acct?.last_login_at ?? null,
      audit_count: r.audit_count ?? 0,
      visibility_score: r.visibility_score,
      last_audit_at: r.last_audit_at,
      health_score: health.score, health_band: health.band, health_reasons: health.reasons,
    }
  })
  // At-risk first so the operator sees who needs attention.
  clients.sort((a, b) => a.health_score - b.health_score)

  const paying = clients.filter((c) => c.plan !== 'free').length
  const atRisk = clients.filter((c) => c.health_band === 'at_risk').length
  const avgHealth = clients.length ? Math.round(clients.reduce((s, c) => s + c.health_score, 0) / clients.length) : 0

  return NextResponse.json({ clients, summary: { total: clients.length, paying, atRisk, avgHealth } })
}
