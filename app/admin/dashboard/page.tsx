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
  const d = await getDashboard()
  const hasWarnings = d.warnings.nonRestaurants + d.warnings.duplicateGroups + d.warnings.missingCity + d.warnings.missingCuisine > 0

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Command center</h1>
        <p className="text-sm text-gray-500 mt-1">What needs action today — audit health, outreach queue, and data quality.</p>
      </div>

      {/* Operational stats (no fabricated revenue) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Restaurants" value={d.totalRestaurants} sub={`${d.health.completed} audited`} icon={<UtensilsCrossed className="w-4 h-4" />} />
        <StatCard label="Ready to send" value={d.readyToSend.length} sub="report done, not contacted" icon={<Send className="w-4 h-4" />} />
        <StatCard label="Follow-ups due" value={d.followUpsDue.length} sub="overdue or due today" icon={<CalendarClock className="w-4 h-4" />} />
        <StatCard label="Failed audits" value={d.health.failed} sub="need retry" icon={<AlertCircle className="w-4 h-4" />} />
        <StatCard label="In progress" value={d.health.running + d.health.queued} sub={`${d.health.running} running · ${d.health.queued} queued`} icon={<Loader2 className="w-4 h-4" />} />
      </div>

      {/* Data quality warnings */}
      {hasWarnings && (
        <Card className="mb-6 border-amber-200 bg-amber-50/40">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <CardTitle>Data quality</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700">
              {d.warnings.nonRestaurants > 0 && <span><strong>{d.warnings.nonRestaurants}</strong> non-restaurant entities</span>}
              {d.warnings.duplicateGroups > 0 && <span><strong>{d.warnings.duplicateGroups}</strong> duplicate groups</span>}
              {d.warnings.missingCity > 0 && <span><strong>{d.warnings.missingCity}</strong> missing city</span>}
              {d.warnings.missingCuisine > 0 && <span><strong>{d.warnings.missingCuisine}</strong> missing cuisine</span>}
            </div>
            {d.duplicateNames.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">Possible duplicates: {d.duplicateNames.join(', ')}</p>
            )}
            <Link href="/admin/restaurants" className="text-xs text-blue-500 hover:underline mt-2 inline-block">Review entities →</Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Ready to send */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Send className="w-4 h-4 text-gray-400" /><CardTitle>Ready for outreach</CardTitle></div>
          </CardHeader>
          <CardContent className="pt-0">
            {d.readyToSend.length === 0 ? (
              <p className="text-sm text-gray-400 py-3">Nothing waiting — every completed audit has been contacted.</p>
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

        {/* Failed audits */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-400" /><CardTitle>Failed audits — retry</CardTitle></div>
          </CardHeader>
          <CardContent className="pt-0">
            {d.failedAudits.length === 0 ? (
              <p className="text-sm text-gray-400 py-3">No failed audits.</p>
            ) : (
              <div className="space-y-1">
                {d.failedAudits.map((a) => (
                  <Link key={a.id} href={`/admin/audits/${a.id}`} className="block py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{a.restaurant?.name ?? 'Unknown'}</p>
                      <span className="text-xs text-gray-400">{formatDateTime(a.created_at)}</span>
                    </div>
                    {a.error_message && <p className="text-xs text-red-500 truncate mt-0.5">{a.error_message}</p>}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Follow-ups due */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4 text-gray-400" /><CardTitle>Follow-ups due</CardTitle></div>
          </CardHeader>
          <CardContent className="pt-0">
            {d.followUpsDue.length === 0 ? (
              <p className="text-sm text-gray-400 py-3">No follow-ups due.</p>
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

        {/* Low-confidence audits */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><GaugeCircle className="w-4 h-4 text-gray-400" /><CardTitle>Low-confidence audits</CardTitle></div>
          </CardHeader>
          <CardContent className="pt-0">
            {d.lowConfidence.length === 0 ? (
              <p className="text-sm text-gray-400 py-3">No low-confidence audits — evidence is solid.</p>
            ) : (
              <div className="space-y-1">
                {d.lowConfidence.map((c) => (
                  <Link key={c.audit_id} href={`/admin/audits/${c.audit_id}`} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.restaurant.name}</p>
                      <p className="text-xs text-gray-400">{displayCity(c.restaurant.city)}</p>
                    </div>
                    <span className="text-xs text-gray-500">{Math.round((c.confidence_score ?? 0) * 100)}% confidence</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interested, no next action */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-400" /><CardTitle>Interested — no next step</CardTitle></div>
          </CardHeader>
          <CardContent className="pt-0">
            {d.interestedNoNext.length === 0 ? (
              <p className="text-sm text-gray-400 py-3">Every interested lead has a next step scheduled.</p>
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

      {/* Top opportunities with next action */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Top opportunities</CardTitle>
            <Link href="/admin/leads" className="text-xs text-blue-500 hover:underline">All leads →</Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {d.topOpportunities.length === 0 ? (
            <p className="text-sm text-gray-400 py-3">No completed audits yet.</p>
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
                      <span className="text-xs text-gray-400">{contacted ? o.lead.replace('_', ' ') : 'send report'}</span>
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
