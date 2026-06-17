'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  BarChart2, TrendingUp, TrendingDown, AlertCircle, Globe,
  RefreshCw, PlayCircle, Loader2, ChevronRight, Users2,
  CheckCircle2, XCircle, Clock, Eye
} from 'lucide-react'
import Link from 'next/link'
import { ESTIMATE_CAVEAT } from '@/lib/estimates'

// ── Types ─────────────────────────────────────────────────────────
interface Overview {
  totalRestaurants: number
  totalAudits: number
  completedAudits: number
  failedAudits: number
  runningAudits: number
  avgVisibility: number
  avgOpportunity: number
  avgMentionFreq: number
  totalScores: number
  missingScores: number
}

interface OpportunityRow {
  restaurant_id: string
  visibility_score: number
  opportunity_score: number
  estimated_revenue_min: number
  estimated_revenue_max: number
  audit_id: string
  restaurant: { name: string; city: string; website: string; email: string } | null
}

interface VisibilityRow {
  restaurant_id: string
  visibility_score: number
  mention_frequency: number
  model_consensus: number
  audit_id: string
  restaurant: { name: string; city: string; cuisine: string } | null
}

interface CompetitorRow {
  name: string
  total_mentions: number
  avg_position: number
  avg_sentiment: number
  appearances: number
}

interface FailedAudit {
  id: string
  created_at: string
  restaurant_id: string
  restaurant: { name: string; city: string; website: string } | null
}

interface WebsiteSignals {
  total: number
  schema_pct: number
  menu_pct: number
  hours_pct: number
  reservation_pct: number
  social_pct: number
  avg_reviews: number
}

type Tab = 'overview' | 'opportunities' | 'visibility' | 'competitors' | 'signals' | 'issues'

// ── Helpers ───────────────────────────────────────────────────────
function ScoreBadge({ score, size = 'sm' }: { score: number; size?: 'sm' | 'md' }) {
  const color = score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-red-400'
  return (
    <span className={`font-semibold tabular-nums ${color} ${size === 'md' ? 'text-lg' : 'text-sm'}`}>
      {score}
    </span>
  )
}

function StatCard({ label, value, sub, icon: Icon, trend }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className="p-2 bg-gray-50 rounded-lg">
          <Icon className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>
  )
}

function SignalBar({ label, pct }: { label: string; pct: number }) {
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 text-sm text-gray-600 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-sm font-medium text-gray-700 tabular-nums">{pct}%</span>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [opportunities, setOpportunities] = useState<OpportunityRow[]>([])
  const [lowVisibility, setLowVisibility] = useState<VisibilityRow[]>([])
  const [competitors, setCompetitors] = useState<CompetitorRow[]>([])
  const [failedAudits, setFailedAudits] = useState<FailedAudit[]>([])
  const [missingScores, setMissingScores] = useState<FailedAudit[]>([])
  const [signals, setSignals] = useState<WebsiteSignals | null>(null)
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const fetchQuery = useCallback(async (q: string) => {
    setLoading(l => ({ ...l, [q]: true }))
    try {
      const res = await fetch(`/api/analytics?query=${q}`)
      const json = await res.json()
      return json
    } finally {
      setLoading(l => ({ ...l, [q]: false }))
    }
  }, [])

  // Load overview on mount
  useEffect(() => {
    fetchQuery('overview').then(d => setOverview(d))
  }, [fetchQuery])

  // Load tab data on switch
  useEffect(() => {
    if (activeTab === 'opportunities' && opportunities.length === 0) {
      fetchQuery('top_opportunities').then(d => setOpportunities(d.data ?? []))
    }
    if (activeTab === 'visibility' && lowVisibility.length === 0) {
      fetchQuery('lowest_visibility').then(d => setLowVisibility(d.data ?? []))
    }
    if (activeTab === 'competitors' && competitors.length === 0) {
      fetchQuery('top_competitors').then(d => setCompetitors(d.data ?? []))
    }
    if (activeTab === 'signals' && !signals) {
      fetchQuery('website_signals').then(d => setSignals(d))
    }
    if (activeTab === 'issues' && failedAudits.length === 0) {
      fetchQuery('failed_audits').then(d => setFailedAudits(d.data ?? []))
      fetchQuery('missing_scores').then(d => setMissingScores(d.data ?? []))
    }
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const rerunAudit = async (restaurant_id: string, audit_id: string | null, name: string) => {
    setActionLoading(restaurant_id)
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id, audit_id }),
      })
      const json = await res.json()
      if (json.success) {
        showToast(`Audit queued for ${name}`)
        // Refresh issues
        fetchQuery('failed_audits').then(d => setFailedAudits(d.data ?? []))
        fetchQuery('missing_scores').then(d => setMissingScores(d.data ?? []))
        fetchQuery('overview').then(d => setOverview(d))
      } else {
        showToast(`Error: ${json.error}`)
      }
    } finally {
      setActionLoading(null)
    }
  }

  const rerunAll = async (items: FailedAudit[]) => {
    for (const item of items) {
      await rerunAudit(item.restaurant_id, item.id, item.restaurant?.name ?? 'restaurant')
      await new Promise(r => setTimeout(r, 300))
    }
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'opportunities', label: 'Opportunities', icon: TrendingUp },
    { id: 'visibility', label: 'Low Visibility', icon: TrendingDown },
    { id: 'competitors', label: 'Competitors', icon: Users2 },
    { id: 'signals', label: 'Website Signals', icon: Globe },
    {
      id: 'issues', label: 'Issues',
      icon: AlertCircle,
      badge: (overview?.failedAudits ?? 0) + (overview?.missingScores ?? 0) || undefined
    },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">Explore audit data, find opportunities, and fix issues.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-8">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge ? (
              <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold bg-red-100 text-red-600 rounded-full">
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ── Overview ─────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {loading['overview'] || !overview ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Restaurants" value={overview.totalRestaurants} icon={Eye} />
                <StatCard label="Audits run" value={overview.totalAudits} sub={`${overview.completedAudits} completed`} icon={CheckCircle2} />
                <StatCard label="Avg visibility" value={`${overview.avgVisibility}/100`} icon={BarChart2} />
                <StatCard label="Avg opportunity" value={`${overview.avgOpportunity}/100`} icon={TrendingUp} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Avg mention rate" value={`${overview.avgMentionFreq}%`} icon={RefreshCw} />
                <StatCard label="Scored audits" value={overview.totalScores} icon={CheckCircle2} />
                <StatCard label="Missing scores" value={overview.missingScores} sub="completed but no score" icon={AlertCircle} />
                <StatCard label="Failed audits" value={overview.failedAudits} icon={XCircle} />
              </div>

              {/* Quick links */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { tab: 'opportunities' as Tab, label: 'View top opportunities', icon: TrendingUp, color: 'text-emerald-600' },
                  { tab: 'issues' as Tab, label: 'Fix failed & missing audits', icon: AlertCircle, color: 'text-red-600' },
                  { tab: 'competitors' as Tab, label: 'Explore competitor data', icon: Users2, color: 'text-blue-600' },
                ].map(({ tab, label, icon: Icon, color }) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Opportunities ─────────────────────────────────────────── */}
      {activeTab === 'opportunities' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">Restaurants with the highest opportunity score — most to gain from AI visibility improvements.</p>
            <button onClick={() => { setOpportunities([]); fetchQuery('top_opportunities').then(d => setOpportunities(d.data ?? [])) }}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
          {loading['top_opportunities'] ? (
            <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visibility</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opportunity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Est. Revenue</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {opportunities.map((row, i) => (
                    <tr key={row.restaurant_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{row.restaurant?.name ?? '—'}</p>
                        <p className="text-xs text-gray-400">{row.restaurant?.city}</p>
                      </td>
                      <td className="px-4 py-3"><ScoreBadge score={row.visibility_score} /></td>
                      <td className="px-4 py-3"><ScoreBadge score={row.opportunity_score} /></td>
                      <td className="px-4 py-3 text-gray-600 text-xs" title={ESTIMATE_CAVEAT}>
                        ~€{(row.estimated_revenue_min ?? 0).toLocaleString()} – €{(row.estimated_revenue_max ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => rerunAudit(row.restaurant_id, row.audit_id, row.restaurant?.name ?? '')}
                          disabled={actionLoading === row.restaurant_id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white hover:border-gray-400 disabled:opacity-50 transition-colors"
                        >
                          {actionLoading === row.restaurant_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlayCircle className="w-3 h-3" />}
                          Re-audit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {opportunities.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No data yet. Run some audits first.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-gray-400">{ESTIMATE_CAVEAT}</p>
        </div>
      )}

      {/* ── Low Visibility ────────────────────────────────────────── */}
      {activeTab === 'visibility' && (
        <div>
          <div className="mb-4">
            <p className="text-sm text-gray-500">Restaurants with the lowest AI visibility — barely appearing in AI recommendations.</p>
          </div>
          {loading['lowest_visibility'] ? (
            <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visibility</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mention rate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model consensus</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {lowVisibility.map(row => (
                    <tr key={row.restaurant_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{row.restaurant?.name ?? '—'}</p>
                        <p className="text-xs text-gray-400">{row.restaurant?.city} · {row.restaurant?.cuisine}</p>
                      </td>
                      <td className="px-4 py-3"><ScoreBadge score={row.visibility_score} /></td>
                      <td className="px-4 py-3 text-gray-600">{Math.round((row.mention_frequency ?? 0) * 100)}%</td>
                      <td className="px-4 py-3 text-gray-600">{Math.round((row.model_consensus ?? 0) * 100)}%</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => rerunAudit(row.restaurant_id, row.audit_id, row.restaurant?.name ?? '')}
                          disabled={actionLoading === row.restaurant_id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white hover:border-gray-400 disabled:opacity-50 transition-colors"
                        >
                          {actionLoading === row.restaurant_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlayCircle className="w-3 h-3" />}
                          Re-audit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {lowVisibility.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No data yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Competitors ───────────────────────────────────────────── */}
      {activeTab === 'competitors' && (
        <div>
          <div className="mb-4">
            <p className="text-sm text-gray-500">Restaurants most frequently recommended by AI models across all audits.</p>
          </div>
          {loading['top_competitors'] ? (
            <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total mentions</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg position</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Appears in</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {competitors.map((row, i) => (
                    <tr key={row.name} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400 font-medium">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                      <td className="px-4 py-3 text-gray-700 font-semibold">{row.total_mentions}</td>
                      <td className="px-4 py-3 text-gray-600">#{row.avg_position}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{row.appearances} audit{row.appearances !== 1 ? 's' : ''}</td>
                    </tr>
                  ))}
                  {competitors.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No competitor data yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Website Signals ───────────────────────────────────────── */}
      {activeTab === 'signals' && (
        <div>
          <div className="mb-6">
            <p className="text-sm text-gray-500">How well-structured are the audited restaurants' websites? These signals directly affect AI visibility.</p>
          </div>
          {loading['website_signals'] || !signals ? (
            <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Signal coverage across {signals.total} audits</h3>
                <div className="space-y-3">
                  <SignalBar label="Schema markup" pct={signals.schema_pct} />
                  <SignalBar label="Menu present" pct={signals.menu_pct} />
                  <SignalBar label="Opening hours" pct={signals.hours_pct} />
                  <SignalBar label="Reservation links" pct={signals.reservation_pct} />
                  <SignalBar label="Social links" pct={signals.social_pct} />
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg review count</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{signals.avg_reviews}</p>
                  <p className="mt-1 text-xs text-gray-400">across all audited websites</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-medium text-amber-800">Biggest gap</p>
                  <p className="mt-1 text-sm text-amber-700">
                    {[
                      { label: 'Schema markup', pct: signals.schema_pct },
                      { label: 'Menu', pct: signals.menu_pct },
                      { label: 'Opening hours', pct: signals.hours_pct },
                    ].sort((a, b) => a.pct - b.pct)[0].label} is missing from the most restaurants — fixing this will have the highest impact on AI visibility.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Issues ────────────────────────────────────────────────── */}
      {activeTab === 'issues' && (
        <div className="space-y-8">

          {/* Failed audits */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-gray-800">Failed audits</h3>
                <p className="text-xs text-gray-500 mt-0.5">These audits errored out and need to be re-run.</p>
              </div>
              {failedAudits.length > 0 && (
                <button
                  onClick={() => rerunAll(failedAudits)}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  Re-run all ({failedAudits.length})
                </button>
              )}
            </div>
            {loading['failed_audits'] ? (
              <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Failed at</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {failedAudits.map(audit => (
                      <tr key={audit.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{audit.restaurant?.name ?? '—'}</p>
                          <p className="text-xs text-gray-400">{audit.restaurant?.city}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(audit.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => rerunAudit(audit.restaurant_id, audit.id, audit.restaurant?.name ?? '')}
                            disabled={actionLoading === audit.restaurant_id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white hover:border-gray-400 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === audit.restaurant_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlayCircle className="w-3 h-3" />}
                            Re-run
                          </button>
                        </td>
                      </tr>
                    ))}
                    {failedAudits.length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-400">No failed audits.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Missing scores */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-gray-800">Completed but missing score</h3>
                <p className="text-xs text-gray-500 mt-0.5">Audits that completed but didn't save a visibility score.</p>
              </div>
              {missingScores.length > 0 && (
                <button
                  onClick={() => rerunAll(missingScores)}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  Re-run all ({missingScores.length})
                </button>
              )}
            </div>
            {loading['missing_scores'] ? (
              <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed at</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {missingScores.map((audit: any) => (
                      <tr key={audit.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{audit.restaurant?.name ?? '—'}</p>
                          <p className="text-xs text-gray-400">{audit.restaurant?.city}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(audit.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => rerunAudit(audit.restaurant_id, audit.id, audit.restaurant?.name ?? '')}
                            disabled={actionLoading === audit.restaurant_id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white hover:border-gray-400 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === audit.restaurant_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlayCircle className="w-3 h-3" />}
                            Re-run
                          </button>
                        </td>
                      </tr>
                    ))}
                    {missingScores.length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-400">All completed audits have scores.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white bg-gray-900 z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
