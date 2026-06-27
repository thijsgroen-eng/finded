import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PROSPECT_STATUSES = [
  'not_audited', 'audit_queued', 'audit_complete', 'outreach_ready', 'contacted', 'customer', 'monitoring',
] as const

const SORTABLE = new Set(['name', 'city', 'visibility_score', 'last_audit_at', 'audit_count', 'created_at', 'prospect_status'])

/**
 * GET /api/admin/restaurants  (admin-gated)
 * The Restaurant Database: filter/sort/paginate over restaurant_overview
 * (restaurant + latest audit + visibility score + audit count). Built for scale.
 *
 * Query: q, city, cuisine, prospect_status, plan, score_min, score_max,
 *        sort, dir (asc|desc), page, limit
 */
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  const q = sp.get('q')?.trim() ?? ''
  const city = sp.get('city')?.trim() ?? ''
  const cuisine = sp.get('cuisine')?.trim() ?? ''
  const status = sp.get('prospect_status') ?? ''
  const plan = sp.get('plan') ?? ''
  const scoreMin = sp.get('score_min')
  const scoreMax = sp.get('score_max')
  const sort = SORTABLE.has(sp.get('sort') ?? '') ? sp.get('sort')! : 'last_audit_at'
  const dir = sp.get('dir') === 'asc'
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10))
  const limit = Math.min(200, Math.max(1, parseInt(sp.get('limit') ?? '50', 10)))
  const offset = (page - 1) * limit

  let query = supabaseAdmin.from('restaurant_overview').select('*', { count: 'exact' })
  if (q) query = query.or(`name.ilike.%${q}%,website.ilike.%${q}%,email.ilike.%${q}%`)
  if (city) query = query.ilike('city', `%${city}%`)
  if (cuisine) query = query.ilike('cuisine', `%${cuisine}%`)
  if (status) query = query.eq('prospect_status', status)
  if (plan) query = query.eq('plan', plan)
  if (scoreMin) query = query.gte('visibility_score', Number(scoreMin))
  if (scoreMax) query = query.lte('visibility_score', Number(scoreMax))
  query = query.order(sort, { ascending: dir, nullsFirst: false }).range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [], meta: { total: count ?? 0, page, limit, pages: Math.ceil((count ?? 0) / limit) } })
}

/**
 * POST /api/admin/restaurants  { ids[], action, ... }  (admin-gated)
 * Bulk actions: set_status | run_audit | export
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const ids = Array.isArray(body.ids) ? (body.ids as string[]).filter((x) => typeof x === 'string') : []
  const action = body.action
  if (ids.length === 0) return NextResponse.json({ error: 'No restaurants selected' }, { status: 400 })

  if (action === 'set_status') {
    const status = body.status
    if (!PROSPECT_STATUSES.includes(status as any)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    const { error } = await supabaseAdmin.from('restaurants').update({ prospect_status: status }).in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, updated: ids.length })
  }

  if (action === 'run_audit') {
    const { createAudit } = await import('@/lib/engine/audit-runner')
    let queued = 0
    for (const id of ids.slice(0, 500)) {
      try { await createAudit(id); queued++ } catch { /* skip failures */ }
    }
    await supabaseAdmin.from('restaurants').update({ prospect_status: 'audit_queued' }).in('id', ids).eq('prospect_status', 'not_audited')
    return NextResponse.json({ ok: true, queued })
  }

  if (action === 'export') {
    const { data } = await supabaseAdmin.from('restaurant_overview').select('name, city, cuisine, website, email, prospect_status, visibility_score, last_audit_at, audit_count, plan').in('id', ids)
    const rows = data ?? []
    const head = ['Name', 'City', 'Cuisine', 'Website', 'Email', 'Status', 'Visibility', 'Last audit', 'Audits', 'Plan']
    const esc = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
    const csv = [head.join(','), ...rows.map((r: any) => [r.name, r.city, r.cuisine, r.website, r.email, r.prospect_status, r.visibility_score, r.last_audit_at, r.audit_count, r.plan].map(esc).join(','))].join('\n')
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="finded-restaurants.csv"' } })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
