import { supabaseAdmin } from '@/lib/supabase/client'
import { StatCard, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { formatDateTime, statusVariant } from '@/lib/utils'
import {
  UtensilsCrossed, ClipboardList, TrendingUp,
  CheckCircle2, Clock, AlertCircle, Loader2,
  Users, Euro, Target, Mail
} from 'lucide-react'
import Link from 'next/link'

async function getDashboardData() {
  const [
    { count: totalRestaurants },
    { count: totalAudits },
    { count: completedAudits },
    { count: queuedAudits },
    { count: runningAudits },
    { count: failedAudits },
    { data: recentAudits },
    { data: leadStatusData },
    { data: topOpportunities },
    { data: customers },
  ] = await Promise.all([
    supabaseAdmin.from('restaurants').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('audits').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('audits').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabaseAdmin.from('audits').select('id', { count: 'exact', head: true }).eq('status', 'queued'),
    supabaseAdmin.from('audits').select('id', { count: 'exact', head: true }).eq('status', 'running'),
    supabaseAdmin.from('audits').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    supabaseAdmin
      .from('audits')
      .select('id, status, created_at, completed_at, restaurant:restaurants(name, city)')
      .order('created_at', { ascending: false })
      .limit(8),
    supabaseAdmin
      .from('lead_statuses')
      .select('status'),
    supabaseAdmin
      .from('visibility_scores')
      .select('restaurant_id, opportunity_score, visibility_score, estimated_revenue_min, estimated_revenue_max, audit_id, restaurant:restaurants(name, city)')
      .order('opportunity_score', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('customers')
      .select('id, plan, status')
      .eq('status', 'active'),
  ])

  // Lead pipeline counts
  const leads = leadStatusData ?? []
  const pipeline = {
    not_contacted: leads.filter(l => l.status === 'not_contacted').length,
    contacted: leads.filter(l => ['email_sent', 'opened', 'replied'].includes(l.status)).length,
    interested: leads.filter(l => ['interested', 'demo_scheduled'].includes(l.status)).length,
    customer: leads.filter(l => l.status === 'customer').length,
    lost: leads.filter(l => l.status === 'lost').length,
  }

  // MRR estimate
  const activeCustomers = customers ?? []
  const mrr = activeCustomers.reduce((sum, c) => {
    if (c.plan === 'pro') return sum + 299
    if (c.plan === 'platform') return sum + 2000
    return sum + 99
  }, 0)

  return {
    totalRestaurants: totalRestaurants ?? 0,
    totalAudits: totalAudits ?? 0,
    completedAudits: completedAudits ?? 0,
    queuedAudits: queuedAudits ?? 0,
    runningAudits: runningAudits ?? 0,
    failedAudits: failedAudits ?? 0,
    recentAudits: recentAudits ?? [],
    pipeline,
    topOpportunities: topOpportunities ?? [],
    activeCustomers: activeCustomers.length,
    mrr,
  }
}

const PIPELINE_STAGES = [
  { key: 'not_contacted', label: 'Not contacted', color: 'bg-gray-100 text-gray-600' },
  { key: 'contacted', label: 'Contacted', color: 'bg-blue-50 text-blue-600' },
  { key: 'interested', label: 'Interested', color: 'bg-amber-50 text-amber-600' },
  { key: 'customer', label: 'Customer', color: 'bg-emerald-50 text-emerald-600' },
  { key: 'lost', label: 'Lost', color: 'bg-red-50 text-red-500' },
]

export default async function DashboardPage() {
  const d = await getDashboardData()

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Sales pipeline and platform overview</p>
      </div>

      {/* Revenue + sales stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Monthly recurring revenue"
          value={`€${d.mrr.toLocaleString()}`}
          sub={`${d.activeCustomers} active customers`}
          icon={<Euro className="w-4 h-4" />}
        />
        <StatCard
          label="Interested leads"
          value={d.pipeline.interested}
          sub="demo scheduled or interested"
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard
          label="Contacted"
          value={d.pipeline.contacted}
          sub="email sent / opened / replied"
          icon={<Mail className="w-4 h-4" />}
        />
        <StatCard
          label="Total restaurants"
          value={d.totalRestaurants}
          sub={`${d.completedAudits} audited`}
          icon={<UtensilsCrossed className="w-4 h-4" />}
        />
      </div>

      {/* Lead pipeline funnel */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lead pipeline</CardTitle>
            <Link href="/admin/leads" className="text-xs text-blue-500 hover:underline">View all →</Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            {PIPELINE_STAGES.map(stage => {
              const count = d.pipeline[stage.key as keyof typeof d.pipeline]
              return (
                <div key={stage.key} className="flex-1 text-center">
                  <div className={`rounded-lg py-3 px-2 mb-2 ${stage.color}`}>
                    <div className="text-xl font-bold">{count}</div>
                  </div>
                  <div className="text-xs text-gray-500">{stage.label}</div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top opportunities */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Top opportunities</CardTitle>
              <Link href="/admin/leads?status=not_contacted" className="text-xs text-blue-500 hover:underline">View all →</Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {d.topOpportunities.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">No audits completed yet</p>
            ) : (
              <div className="space-y-2">
                {d.topOpportunities.map((opp: any) => {
                  const restaurant = Array.isArray(opp.restaurant) ? opp.restaurant[0] : opp.restaurant
                  return (
                    <div key={opp.audit_id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{restaurant?.name ?? '—'}</p>
                        <p className="text-xs text-gray-400">{restaurant?.city ?? ''}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${
                          opp.opportunity_score >= 75 ? 'text-red-600' :
                          opp.opportunity_score >= 50 ? 'text-amber-600' : 'text-gray-600'
                        }`}>
                          {Math.round(opp.opportunity_score ?? 0)}/100
                        </div>
                        {opp.estimated_revenue_max > 0 && (
                          <div className="text-xs text-gray-400">
                            €{(opp.estimated_revenue_min ?? 0).toLocaleString()}–€{(opp.estimated_revenue_max ?? 0).toLocaleString()}/mo
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit status */}
        <Card>
          <CardHeader><CardTitle>Audit status</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex items-center gap-3 py-2 border-b border-gray-50">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-sm text-gray-600 flex-1">Completed</span>
                <span className="text-sm font-bold text-gray-900">{d.completedAudits}</span>
              </div>
              <div className="flex items-center gap-3 py-2 border-b border-gray-50">
                <Loader2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="text-sm text-gray-600 flex-1">Running / Queued</span>
                <span className="text-sm font-bold text-gray-900">{d.runningAudits + d.queuedAudits}</span>
              </div>
              <div className="flex items-center gap-3 py-2 border-b border-gray-50">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-gray-600 flex-1">Failed</span>
                <span className="text-sm font-bold text-gray-900">{d.failedAudits}</span>
              </div>
              <div className="flex items-center gap-3 py-2">
                <ClipboardList className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600 flex-1">Total audits</span>
                <span className="text-sm font-bold text-gray-900">{d.totalAudits}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent audits */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent audits</CardTitle>
            <Link href="/admin/audits" className="text-xs text-blue-500 hover:underline">View all →</Link>
          </div>
        </CardHeader>
        <div className="divide-y divide-gray-50">
          {d.recentAudits.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-400">
              No audits yet. Upload restaurants to get started.
            </div>
          ) : (
            d.recentAudits.map((audit: any) => {
              const rest = Array.isArray(audit.restaurant) ? audit.restaurant[0] : audit.restaurant
              return (
                <div key={audit.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{rest?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-gray-400">{rest?.city ?? ''} · {formatDateTime(audit.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {audit.status === 'running' && <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
                    <Badge variant={statusVariant(audit.status) as 'success' | 'warning' | 'danger' | 'info' | 'default'}>
                      {audit.status}
                    </Badge>
                    {audit.status === 'completed' && (
                      <Link href={`/admin/audits/${audit.id}`} className="text-xs text-blue-500 hover:underline">View →</Link>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>
    </div>
  )
}
