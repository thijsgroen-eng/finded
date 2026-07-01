import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/client'
import { StatCard, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { formatDateTime } from '@/lib/utils'
import {
  onlyRestaurants, dataQualityWarnings, findDuplicateGroups,
  displayCity, type EntityRow,
} from '@/lib/engine/dashboard'
import {
  UtensilsCrossed, AlertCircle, Loader2, Clock,
  Send, CalendarClock, Sparkles, ShieldAlert, GaugeCircle,
} from 'lucide-react'
import Link from 'next/link'
import { ADMIN_COPY, type AdminLang } from '@/lib/admin-copy'

const CONTACTED = new Set(['email_sent', 'opened', 'replied', 'interested', 'demo_scheduled', 'customer', 'lost'])

async function getDashboard() {
  const [
    { data: restaurants },
    { data: audits },
    { data: scores },
    { data: leads },
  ] = await Promise.all([
    supabaseAdmin.from('restaurants').select('id, name, city, cuisine, business_type, website, domain'),
    supabaseAdmin.from('audits').select('id, restaurant_id, status, error_message, created_at').order('created_at', { ascending: false }),
    supabaseAdmin.from('visibility_scores').select('restaurant_id, audit_id, opportunity_score, visibility_score, confidence_score'),
    supabaseAdmin.from('lead_statuses').select('restaurant_id, status, next_followup_at'),
  ])

  const allEntities = (restaurants ?? []) as EntityRow[]
  const restRows = onlyRestaurants(allEntities)
  const restById = new Map(restRows.map((r) => [r.id, r]))
  const leadByRest = new Map((leads ?? []).map((l) => [l.restaurant_id, l]))

  // Best (highest-opportunity) completed audit per restaurant. visibility_scores
  // only exist for completed audits, so presence here means "report ready".
  const bestByRest = new Map<string, { audit_id: string; opportunity_score: number; visibility_score: number; confidence_score: number | null }>()
  for (const s of scores ?? []) {
    if (!restById.has(s.restaurant_id)) continue
    const cur = bestByRest.get(s.restaurant_id)
    if (!cur || Number(s.opportunity_score ?? 0) > cur.opportunity_score) {
      bestByRest.set(s.restaurant_id, {
        audit_id: s.audit_id,
        opportunity_score: Number(s.opportunity_score ?? 0),
        visibility_score: Number(s.visibility_score ?? 0),
        confidence_score: s.confidence_score != null ? Number(s.confidence_score) : null,
      })
    }
  }

  const allAudits = audits ?? []
  const health = {
    completed: allAudits.filter((a) => a.status === 'completed').length,
    running: allAudits.filter((a) => a.status === 'running').length,
    queued: allAudits.filter((a) => a.status === 'queued').length,
    failed: allAudits.filter((a) => a.status === 'failed').length,
    total: allAudits.length,
  }

  // ── Action queues ──
  const failedAudits = allAudits
    .filter((a) => a.status === 'failed')
    .slice(0, 6)
    .map((a) => ({ ...a, restaurant: restById.get(a.restaurant_id) ?? null }))

  const now = Date.now()
  const followUpsDue = (leads ?? [])
    .filter((l) => l.next_followup_at && new Date(l.next_followup_at).getTime() <= now && restById.has(l.restaurant_id))
    .map((l) => ({ ...l, restaurant: restById.get(l.restaurant_id)! }))

  const interestedNoNext = (leads ?? [])
    .filter((l) => ['interested', 'demo_scheduled'].includes(l.status) && !l.next_followup_at && restById.has(l.restaurant_id))
    .map((l) => ({ ...l, restaurant: restById.get(l.restaurant_id)! }))

  // Reports ready but lead not yet contacted, highest opportunity first.
  const readyToSend = [...bestByRest.entries()]
    .filter(([rid]) => !CONTACTED.has(leadByRest.get(rid)?.status ?? 'not_contacted'))
    .map(([rid, s]) => ({ restaurant: restById.get(rid)!, ...s }))
    .sort((a, b) => b.opportunity_score - a.opportunity_score)
    .slice(0, 6)

  // Top opportunities (deduped by restaurant) with their current lead status.
  const topOpportunities = [...bestByRest.entries()]
    .map(([rid, s]) => ({ restaurant: restById.get(rid)!, lead: leadByRest.get(rid)?.status ?? 'not_contacted', ...s }))
    .sort((a, b) => b.opportunity_score - a.opportunity_score)
    .slice(0, 6)

  // Audits whose score rests on thin evidence — worth a re-run before outreach.
  const lowConfidence = [...bestByRest.entries()]
    .filter(([, s]) => s.confidence_score != null && s.confidence_score < 0.5)
    .map(([rid, s]) => ({ restaurant: restById.get(rid)!, ...s }))
    .sort((a, b) => (a.confidence_score ?? 0) - (b.confidence_score ?? 0))
    .slice(0, 6)

  const warnings = dataQualityWarnings(allEntities)
  const duplicateNames = findDuplicateGroups(allEntities)
    .slice(0, 5)
    .map((g) => g[0].name)

  return {
    totalRestaurants: restRows.length,
    health, failedAudits, followUpsDue, interestedNoNext, readyToSend, topOpportunities,
    lowConfidence, warnings, duplicateNames,
  }
}

function OppBadge({ score }: { score: number }) {
  const color = score >= 75 ? 'text-red-600' : score >= 50 ? 'text-amber-600' : score >= 25 ? 'text-blue-600' : 'text-gray-500'
  return <span className={`font-bold ${color}`}>{Math.round(score)}/100</span>
}

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const lang = (cookieStore.get('finded_lang')?.value ?? 'nl') as AdminLang
  const t = ADMIN_COPY[lang].dashboard

  const d = await getDashboard()
  const hasWarnings = d.warnings.nonRestaurants + d.warnings.duplicateGroups + d.warnings.missingCity + d.warnings.missingCuisine > 0

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label={t.stats.restaurants} value={d.totalRestaurants} sub={`${d.health.completed} ${t.stats.audited}`} icon={<UtensilsCrossed className="w-4 h-4" />} />
        <StatCard label={t.stats.readyToSend} value={d.readyToSend.length} sub={t.stats.readyToSendSub} icon={<Send className="w-4 h-4" />} />
        <StatCard label={t.stats.followUpsDue} value={d.followUpsDue.length} sub={t.stats.followUpsDueSub} icon={<CalendarClock className="w-4 h-4" />} />
        <StatCard label={t.stats.failedAudits} value={d.health.failed} sub={t.stats.failedAuditsSub} icon={<AlertCircle className="w-4 h-4" />} />
        <StatCard label={t.stats.inProgress} value={d.health.running + d.health.queued} sub={`${d.health.running} ${t.stats.running} · ${d.health.queued} ${t.stats.queued}`} icon={<Loader2 className="w-4 h-4" />} />
      </div>

      {hasWarnings && (
        <Card className="mb-6 border-amber-200 bg-amber-50/40">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <CardTitle>{t.dataQuality}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700">
              {d.warnings.nonRestaurants > 0 && <span><strong>{d.warnings.nonRestaurants}</strong> {t.nonRestaurants}</span>}
              {d.warnings.duplicateGroups > 0 && <span><strong>{d.warnings.duplicateGroups}</strong> {t.duplicateGroups}</span>}
              {d.warnings.missingCity > 0 && <span><strong>{d.warnings.missingCity}</strong> {t.missingCity}</span>}
              {d.warnings.missingCuisine > 0 && <span><strong>{d.warnings.missingCuisine}</strong> {t.missingCuisine}</span>}
            </div>
            {d.duplicateNames.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">{t.possibleDuplicates}: {d.duplicateNames.join(', ')}</p>
            )}
            <Link href="/admin/restaurants" className="text-xs text-blue-500 hover:underline mt-2 inline-block">{t.reviewEntities}</Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Send className="w-4 h-4 text-gray-400" /><CardTitle>{t.readyForOutreach}</CardTitle></div>
          </CardHeader>
          <CardContent className="pt-0">
            {d.readyToSend.length === 0 ? (
              <p className="text-sm text-gray-400 py-3">{t.nothingWaiting}</p>
            ) : (
              <div className="space-y-1">
                {d.readyToSend.map((r) => (
                  <Link key={r.audit_id} href={`/admin/audits/${r.audit_id}`} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{r.restaurant.name}</p>
                      <p className="text-xs text-gray-400">{displayCity(r.restaurant.city)}</p>
                    </div>
                    <OppBadge score={r.opportunity_score} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-400" /><CardTitle>{t.failedAuditsRetry}</CardTitle></div>
          </CardHeader>
          <CardContent className="pt-0">
            {d.failedAudits.length === 0 ? (
              <p className="text-sm text-gray-400 py-3">{t.noFailedAudits}</p>
            ) : (
              <div className="space-y-1">
                {d.failedAudits.map((a) => (
                  <Link key={a.id} href={`/admin/audits/${a.id}`} className="block py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{a.restaurant?.name ?? ADMIN_COPY[lang].common.unknown}</p>
                      <span className="text-xs text-gray-400">{formatDateTime(a.created_at)}</span>
                    </div>
                    {a.error_message && <p className="text-xs text-red-500 truncate mt-0.5">{a.error_message}</p>}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4 text-gray-400" /><CardTitle>{t.followUpsDueCard}</CardTitle></div>
          </CardHeader>
          <CardContent className="pt-0">
            {d.followUpsDue.length === 0 ? (
              <p className="text-sm text-gray-400 py-3">{t.noFollowUps}</p>
            ) : (
              <div className="space-y-1">
                {d.followUpsDue.map((l) => (
                  <div key={l.restaurant_id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{l.restaurant.name}</p>
                      <p className="text-xs text-gray-400">{displayCity(l.restaurant.city)}</p>
                    </div>
                    <span className="text-xs text-amber-600 flex items-center gap-1"><Clock className="w-3 h-3" />{l.next_followup_at ? formatDateTime(l.next_followup_at) : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><GaugeCircle className="w-4 h-4 text-gray-400" /><CardTitle>{t.lowConfidence}</CardTitle></div>
          </CardHeader>
          <CardContent className="pt-0">
            {d.lowConfidence.length === 0 ? (
              <p className="text-sm text-gray-400 py-3">{t.noLowConfidence}</p>
            ) : (
              <div className="space-y-1">
                {d.lowConfidence.map((c) => (
                  <Link key={c.audit_id} href={`/admin/audits/${c.audit_id}`} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.restaurant.name}</p>
                      <p className="text-xs text-gray-400">{displayCity(c.restaurant.city)}</p>
                    </div>
                    <span className="text-xs text-gray-500">{Math.round((c.confidence_score ?? 0) * 100)}{t.confidence}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-400" /><CardTitle>{t.interestedNoStep}</CardTitle></div>
          </CardHeader>
          <CardContent className="pt-0">
            {d.interestedNoNext.length === 0 ? (
              <p className="text-sm text-gray-400 py-3">{t.everyInterested}</p>
            ) : (
              <div className="space-y-1">
                {d.interestedNoNext.map((l) => (
                  <div key={l.restaurant_id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{l.restaurant.name}</p>
                      <p className="text-xs text-gray-400">{displayCity(l.restaurant.city)}</p>
                    </div>
                    <Badge variant="warning">{l.status.replace('_', ' ')}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t.topOpportunities}</CardTitle>
            <Link href="/admin/leads" className="text-xs text-blue-500 hover:underline">{t.allLeads}</Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {d.topOpportunities.length === 0 ? (
            <p className="text-sm text-gray-400 py-3">{t.noCompletedAudits}</p>
          ) : (
            <div className="space-y-1">
              {d.topOpportunities.map((o) => {
                const contacted = CONTACTED.has(o.lead)
                return (
                  <Link key={o.audit_id} href={`/admin/audits/${o.audit_id}`} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{o.restaurant.name}</p>
                      <p className="text-xs text-gray-400">{displayCity(o.restaurant.city)}{o.restaurant.cuisine ? ` · ${o.restaurant.cuisine}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{contacted ? o.lead.replace('_', ' ') : t.sendReport}</span>
                      <OppBadge score={o.opportunity_score} />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
