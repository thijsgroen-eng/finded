import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/client'
import { readCustomerSession, CUSTOMER_COOKIE } from '@/lib/auth/customer'
import { isValidSession, ADMIN_COOKIE } from '@/lib/auth/admin'
import { computeModelBreakdown } from '@/lib/engine/metrics-core'
import { loadObservations, computePatterns, patternEvidence } from '@/lib/observations'
import { LogoutButton } from '@/components/portal/logout-button'
import { RestaurantDashboard, type DashboardData } from '@/components/portal/restaurant-dashboard'
import { LangToggle } from '@/components/lang-toggle'
import { getViewerLang } from '@/lib/i18n-viewer'
import { getSettings } from '@/lib/settings'
import { PORTAL } from '@/lib/portal-copy'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

const BG = '#D9CDB8', BORDER = 'rgba(36,28,19,0.14)', MUTED = 'rgba(36,28,19,0.66)', FAINT = 'rgba(36,28,19,0.46)'

async function getData(id: string, cid: string | null, bypassOwnership: boolean): Promise<DashboardData | null> {
  if (!bypassOwnership) {
    const { data: link } = await supabaseAdmin.from('customer_restaurants').select('id').eq('customer_user_id', cid).eq('restaurant_id', id).maybeSingle()
    if (!link) return null
  }
  const { data: restaurant } = await supabaseAdmin.from('restaurants').select('id, name, city, cuisine, preview_slug, plan').eq('id', id).single()
  if (!restaurant) return null

  const { data: audit } = await supabaseAdmin
    .from('audits').select('id, reliability, created_at').eq('restaurant_id', id).eq('status', 'completed')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  const base: DashboardData = {
    restaurant, ready: false, auditedAt: audit?.created_at ?? null,
    score: null, mentionedPct: null, consensus: 0, confidence: null,
    scoreComponents: [], competitors: [], modelBreakdown: [], recommendations: [],
    website: null, history: [], insight: null, reliabilityBand: null, reliabilityPct: null,
  }
  if (!audit) return base

  const [{ data: vs }, { data: comps }, { data: ms }, { data: recs }, { data: wa }, { data: history }] = await Promise.all([
    supabaseAdmin.from('visibility_scores').select('visibility_score, mention_frequency, model_consensus, confidence_score, score_breakdown').eq('audit_id', audit.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabaseAdmin.from('competitors').select('name, mention_count, providers').eq('audit_id', audit.id).order('mention_count', { ascending: false }).limit(8),
    supabaseAdmin.from('mentions').select('model, mentioned, prompt_id, position, sentiment').eq('audit_id', audit.id),
    supabaseAdmin.from('recommendations').select('title, why, suggested_fix, evidence, priority_rank, impact_level, effort, confidence, benchmark, data_source, type, description').eq('audit_id', audit.id).order('created_at', { ascending: true }),
    supabaseAdmin.from('website_audits').select('schema_present, menu_or_services_present, menu_present, opening_hours_present, reservation_links_present, booking_present, social_links_present, faq_present, menu_format, schema_types, review_signals, review_count, location_present, contact_present, meta_title, meta_description').eq('audit_id', audit.id).maybeSingle(),
    supabaseAdmin.from('score_history').select('visibility_score, snapshot_date').eq('restaurant_id', id).order('snapshot_date', { ascending: true }).limit(24),
  ])
  if (!vs) return base

  const mentions = (ms ?? []) as { model: string; mentioned: boolean; prompt_id: string; position: number | null }[]
  const modelBreakdown = computeModelBreakdown(mentions).map((m) => ({ model: m.model, mentions: m.mentions, total_prompts: m.total_prompts, frequency: m.frequency, avg_position: m.avg_position }))
  const consensus = vs.model_consensus ?? modelBreakdown.filter((m) => m.mentions > 0).length
  const breakdown = (vs.score_breakdown as { components?: { label: string; score: number; weight: number; detail: string }[] } | null)?.components ?? []

  let insight: string | null = null
  try { const p = computePatterns(await loadObservations()); if (p[0]) insight = patternEvidence(p[0], 'en') } catch { /* none yet */ }

  return {
    restaurant, ready: true, auditedAt: audit.created_at,
    score: vs.visibility_score != null ? Math.round(Number(vs.visibility_score)) : null,
    mentionedPct: vs.mention_frequency != null ? Math.round(Number(vs.mention_frequency) * 100) : null,
    consensus,
    confidence: vs.confidence_score != null ? Math.round(Number(vs.confidence_score) * 100) : null,
    scoreComponents: breakdown.map((c) => ({ label: c.label, score: Math.round(c.score), weight: Math.round((c.weight ?? 0) * 100), detail: c.detail })),
    competitors: (comps ?? []).map((c) => ({ name: c.name, mention_count: c.mention_count })),
    modelBreakdown,
    recommendations: (recs ?? []).map((r) => ({
      title: r.title, why: r.why, what: r.suggested_fix ?? r.description, evidence: r.evidence,
      priority_rank: r.priority_rank, impact_level: r.impact_level, effort: r.effort,
      confidence: r.confidence, benchmark: r.benchmark, data_source: r.data_source, type: r.type,
    })),
    website: wa ? {
      schema_present: !!wa.schema_present,
      menu_present: !!(wa.menu_or_services_present ?? wa.menu_present),
      menu_format: wa.menu_format ?? null,
      opening_hours_present: !!wa.opening_hours_present,
      reservation_present: !!(wa.reservation_links_present ?? wa.booking_present),
      social_present: !!wa.social_links_present,
      faq_present: !!wa.faq_present,
      reviews_present: !!wa.review_signals || (wa.review_count ?? 0) > 0,
      location_present: !!(wa.location_present || wa.contact_present),
      schema_types: (wa.schema_types ?? []) as string[],
      meta_title: wa.meta_title ?? null,
      meta_description: wa.meta_description ?? null,
    } : null,
    history: (history ?? []).map((h) => ({ visibility_score: Number(h.visibility_score), snapshot_date: h.snapshot_date })),
    insight,
    reliabilityBand: (audit.reliability as { band?: string } | null)?.band ?? null,
    reliabilityPct: audit.reliability ? Math.round(Number((audit.reliability as { completionRate?: number }).completionRate ?? 0) * 100) : null,
  }
}

export default async function CustomerRestaurantDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const jar = await cookies()
  const customer = await readCustomerSession(jar.get(CUSTOMER_COOKIE)?.value)

  // An operator (admin session) can PREVIEW any client's dashboard from the
  // backoffice; a customer sees only the restaurants they own.
  let adminPreview = false
  if (!customer) {
    if (await isValidSession(jar.get(ADMIN_COOKIE)?.value)) adminPreview = true
    else redirect('/portal/login')
  }

  const data = await getData(id, customer?.cid ?? null, adminPreview)
  if (!data) notFound()

  const lang = await getViewerLang((await getSettings()).defaultLanguage)
  const td = PORTAL[lang].detail
  const tl = PORTAL[lang].list

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#241C13', fontFamily: 'var(--font-inter), sans-serif' }}>
      {adminPreview && (
        <div style={{ background: 'rgba(181,104,58,0.15)', borderBottom: '1px solid rgba(181,104,58,0.3)', padding: '8px 24px', fontSize: 12.5, color: '#B5683A', textAlign: 'center' }}>
          {td.adminPreview} <a href={`/admin/restaurants/${id}`} style={{ color: '#9A5530', fontWeight: 600 }}>{td.backOffice}</a>
        </div>
      )}
      <nav style={{ borderBottom: `1px solid ${BORDER}`, padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(217,205,184,0.92)', backdropFilter: 'blur(14px)' }}>
        <a href={adminPreview ? `/admin/restaurants/${id}` : '/dashboard'} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: MUTED, textDecoration: 'none', fontSize: 13.5, fontWeight: 600 }}>
          <ArrowLeft style={{ width: 15, height: 15 }} /> {adminPreview ? td.backOffice : td.allRestaurants}
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <LangToggle current={lang} tone="light" />
          <span style={{ fontSize: 13, color: FAINT }}>{adminPreview ? td.adminPreviewShort : customer!.email}</span>
          {!adminPreview && <LogoutButton label={tl.logout} />}
        </div>
      </nav>
      <RestaurantDashboard data={data} lang={lang} />
    </div>
  )
}
