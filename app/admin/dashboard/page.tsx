import { supabaseAdmin } from '@/lib/supabase/client'
import { StatCard, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { formatDateTime, statusVariant } from '@/lib/utils'
import {
  UtensilsCrossed, ClipboardList, TrendingUp,
  CheckCircle2, Clock, AlertCircle, Loader2
} from 'lucide-react'

async function getDashboardData() {
  const [
    { count: totalRestaurants },
    { count: totalAudits },
    { count: completedAudits },
    { count: queuedAudits },
    { count: runningAudits },
    { count: failedAudits },
    { data: recentAudits },
    { data: mentionStats },
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
      .limit(10),
    supabaseAdmin
      .from('mentions')
      .select('mentioned')
      .limit(50000),
  ])

  const totalMentionRows = mentionStats?.length ?? 0
  const totalMentioned = mentionStats?.filter((m: { mentioned: boolean }) => m.mentioned).length ?? 0
  const avgFreq = totalMentionRows > 0 ? Math.round((totalMentioned / totalMentionRows) * 100) : 0

  return {
    totalRestaurants: totalRestaurants ?? 0,
    totalAudits: totalAudits ?? 0,
    completedAudits: completedAudits ?? 0,
    queuedAudits: queuedAudits ?? 0,
    runningAudits: runningAudits ?? 0,
    failedAudits: failedAudits ?? 0,
    recentAudits: recentAudits ?? [],
    avgFreq,
  }
}

export default async function DashboardPage() {
  const d = await getDashboardData()

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform overview and audit status</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Restaurants"
          value={d.totalRestaurants}
          icon={<UtensilsCrossed className="w-4 h-4" />}
        />
        <StatCard
          label="Audits run"
          value={d.totalAudits}
          sub={`${d.completedAudits} completed`}
          icon={<ClipboardList className="w-4 h-4" />}
        />
        <StatCard
          label="Avg mention rate"
          value={`${d.avgFreq}%`}
          sub="across all completed audits"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          label="Queue status"
          value={d.queuedAudits + d.runningAudits}
          sub={`${d.queuedAudits} queued · ${d.runningAudits} running`}
          icon={<Clock className="w-4 h-4" />}
        />
      </div>

      {/* Audit status breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Completed</p>
            <p className="text-xl font-bold text-gray-900">{d.completedAudits}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-4">
          <Loader2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Running / Queued</p>
            <p className="text-xl font-bold text-gray-900">{d.runningAudits + d.queuedAudits}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-4">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Failed</p>
            <p className="text-xl font-bold text-gray-900">{d.failedAudits}</p>
          </div>
        </div>
      </div>

      {/* Recent audits */}
      <Card>
        <CardHeader>
          <CardTitle>Recent audits</CardTitle>
        </CardHeader>
        <div className="divide-y divide-gray-50">
          {d.recentAudits.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-400">
              No audits yet. Upload restaurants to get started.
            </div>
          ) : (
            d.recentAudits.map((audit: {
              id: string
              status: string
              created_at: string
              completed_at: string | null
              restaurant: { name: string; city: string } | { name: string; city: string }[] | null
            }) => {
              const rest = Array.isArray(audit.restaurant) ? audit.restaurant[0] : audit.restaurant
              return (
                <div
                  key={audit.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {rest?.name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {rest?.city ?? ''} · {formatDateTime(audit.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {audit.status === 'running' && (
                      <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                    )}
                    <Badge variant={statusVariant(audit.status) as 'success' | 'warning' | 'danger' | 'info' | 'default'}>
                      {audit.status}
                    </Badge>
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
