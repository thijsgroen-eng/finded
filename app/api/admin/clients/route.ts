import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { clientHealth } from '@/lib/crm/health'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const { data: rows, error } = await supabaseAdmin
    .from('restaurant_overview')
    .select('id, name, city, cuisine, email, plan, report_paid, prospect_status, visibility_score, last_audit_at, audit_count, created_at')
    .or('plan.in.(audit,implementation,beta),report_paid.eq.true,prospect_status.in.(customer,monitoring)')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (rows ?? []).map((r: any) => r.id)

  const { data: users } = await supabaseAdmin.from('customer_users').select('email, created_at, last_login_at')
  const byEmail = new Map<string, { created_at: string; last_login_at: string | null }>()
  for (const u of users ?? []) if (u.email) byEmail.set(u.email.toLowerCase(), { created_at: u.created_at, last_login_at: u.last_login_at })

  const revenue = new Map<string, number>()
  const firstPaid = new Map<string, string>()
  if (ids.length) {
    const { data: pays } = await supabaseAdmin
      .from('payments').select('restaurant_id, amount, status, created_at').in('restaurant_id', ids).eq('status', 'paid')
    for (const p of pays ?? []) {
      if (!p.restaurant_id) continue
      revenue.set(p.restaurant_id, (revenue.get(p.restaurant_id) ?? 0) + (p.amount ?? 0))
      const cur = firstPaid.get(p.restaurant_id)
      if (!cur || new Date(p.created_at) < new Date(cur)) firstPaid.set(p.restaurant_id, p.created_at)
    }
  }

  const firstAudit = new Map<string, string>()
  if (ids.length) {
    const { data: auds } = await supabaseAdmin
      .from('audits').select('restaurant_id, completed_at, created_at').in('restaurant_id', ids).eq('status', 'completed')
    for (const a of auds ?? []) {
      if (!a.restaurant_id) continue
      const d = a.completed_at ?? a.created_at
      const cur = firstAudit.get(a.restaurant_id)
      if (!cur || new Date(d) < new Date(cur)) firstAudit.set(a.restaurant_id, d)
    }
  }

  const now = Date.now()
  const clients = (rows ?? []).map((r: any) => {
    const acct = r.email ? byEmail.get(String(r.email).toLowerCase()) : undefined
    const plan = r.plan === 'implementation' ? 'implementation'
      : r.plan === 'beta' ? 'beta'
      : (r.plan === 'audit' || r.report_paid) ? 'audit'
      : 'free'
    const health = clientHealth({
      plan: plan === 'beta' ? 'free' : plan,
      auditCount: r.audit_count ?? 0, visibilityScore: r.visibility_score,
      lastAuditAt: r.last_audit_at, lastLoginAt: acct?.last_login_at ?? null, now,
    })
    return {
      id: r.id, name: r.name, city: r.city, cuisine: r.cuisine, email: r.email,
      plan, prospect_status: r.prospect_status,
      added_at: r.created_at,
      signed_up_at: acct?.created_at ?? null,
      onboarded_at: firstPaid.get(r.id) ?? firstAudit.get(r.id) ?? null,
      revenue_cents: revenue.get(r.id) ?? 0,
      last_active_at: acct?.last_login_at ?? null,
      audit_count: r.audit_count ?? 0,
      visibility_score: r.visibility_score,
      last_audit_at: r.last_audit_at,
      health_score: health.score, health_band: health.band, health_reasons: health.reasons,
    }
  })
  clients.sort((a, b) => a.health_score - b.health_score)

  const paying = clients.filter((c) => c.plan !== 'free' && c.plan !== 'beta').length
  const atRisk = clients.filter((c) => c.health_band === 'at_risk').length
  const avgHealth = clients.length ? Math.round(clients.reduce((s, c) => s + c.health_score, 0) / clients.length) : 0
  const revenueCents = clients.reduce((s, c) => s + c.revenue_cents, 0)

  return NextResponse.json({ clients, summary: { total: clients.length, paying, atRisk, avgHealth, revenueCents } })
}

// POST /api/admin/clients — create a new client or update plan
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const action = body.action

  if (action === 'create') {
    const { name, email, city, cuisine, plan } = body as Record<string, string>
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('restaurants').insert({
      name: name.trim(),
      email: email?.trim() || null,
      city: city?.trim() || null,
      cuisine: cuisine?.trim() || null,
      plan: plan ?? 'free',
      prospect_status: 'customer',
    }).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: data.id })
  }

  if (action === 'set_plan') {
    const { id, plan } = body as Record<string, string>
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const allowed = ['free', 'beta', 'audit', 'implementation']
    if (!allowed.includes(plan)) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    const { error } = await supabaseAdmin.from('restaurants').update({ plan }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete') {
    const { id } = body as Record<string, string>
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const { error } = await supabaseAdmin.from('restaurants').update({ prospect_status: 'not_audited', plan: null }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
