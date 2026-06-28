import { supabaseAdmin } from '@/lib/supabase/client'
import { notFound } from 'next/navigation'
import { RestaurantProfile, type ProfileAudit, type Revenue } from '@/components/admin/restaurant-profile'

export const dynamic = 'force-dynamic'

async function getProfile(id: string) {
  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('id, name, city, cuisine, business_type, country, website, domain, email, phone, place_id, plan, report_paid, preview_slug, prospect_status, tags, internal_notes, next_follow_up, created_at')
    .eq('id', id)
    .single()
  if (!restaurant) return null

  const { data: audits } = await supabaseAdmin
    .from('audits')
    .select('id, status, created_at, completed_at')
    .eq('restaurant_id', id)
    .order('created_at', { ascending: false })

  const auditIds = (audits ?? []).map((a) => a.id)
  // Latest visibility score per audit, mapped onto the audit list.
  const scoreByAudit = new Map<string, number>()
  if (auditIds.length > 0) {
    const { data: scores } = await supabaseAdmin
      .from('visibility_scores')
      .select('audit_id, visibility_score, created_at')
      .in('audit_id', auditIds)
      .order('created_at', { ascending: false })
    for (const s of scores ?? []) {
      if (!scoreByAudit.has(s.audit_id)) scoreByAudit.set(s.audit_id, s.visibility_score)
    }
  }

  const profileAudits: ProfileAudit[] = (audits ?? []).map((a) => ({
    id: a.id,
    status: a.status,
    created_at: a.created_at,
    completed_at: a.completed_at,
    visibility_score: scoreByAudit.has(a.id) ? Math.round(scoreByAudit.get(a.id)!) : null,
  }))

  // Revenue breakdown (paid Stripe payments) — audit vs implementation.
  const { data: pays } = await supabaseAdmin
    .from('payments').select('plan, amount, status, created_at').eq('restaurant_id', id).eq('status', 'paid')
    .order('created_at', { ascending: false })
  const revenue: Revenue = { total: 0, audit: 0, implementation: 0, other: 0, count: (pays ?? []).length, items: [] }
  for (const p of pays ?? []) {
    const amt = p.amount ?? 0
    revenue.total += amt
    if (p.plan === 'audit') revenue.audit += amt
    else if (p.plan === 'implementation') revenue.implementation += amt
    else revenue.other += amt
    revenue.items.push({ plan: p.plan ?? 'other', amount: amt, created_at: p.created_at })
  }

  return { restaurant, audits: profileAudits, revenue }
}

export default async function RestaurantProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getProfile(id)
  if (!data) notFound()
  return <RestaurantProfile restaurant={data.restaurant} audits={data.audits} revenue={data.revenue} />
}
