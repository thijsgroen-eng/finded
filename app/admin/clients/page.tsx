'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, Spinner, EmptyState } from '@/components/ui'
import { Users, Search, HeartPulse, BadgeEuro, AlertTriangle } from 'lucide-react'

interface Client {
  id: string; name: string; city: string | null; cuisine: string | null; email: string | null
  plan: 'free' | 'audit' | 'implementation'; prospect_status: string
  added_at: string; signed_up_at: string | null; last_active_at: string | null
  audit_count: number; visibility_score: number | null; last_audit_at: string | null
  health_score: number; health_band: 'healthy' | 'steady' | 'at_risk'; health_reasons: string[]
}
interface Summary { total: number; paying: number; atRisk: number; avgHealth: number }

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600 border-gray-200',
  audit: 'bg-blue-50 text-blue-700 border-blue-200',
  implementation: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}
const PLAN_LABEL: Record<string, string> = { free: 'Free', audit: 'Audit €49', implementation: 'Implementation €299' }
const HEALTH: Record<string, { label: string; chip: string; dot: string }> = {
  healthy: { label: 'Healthy', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  steady: { label: 'Steady', chip: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  at_risk: { label: 'At risk', chip: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
}
const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString() : '—'
const scoreColor = (n: number | null) => n == null ? 'text-gray-300' : n >= 60 ? 'text-emerald-600' : n >= 30 ? 'text-amber-600' : 'text-red-600'

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[] | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [plan, setPlan] = useState('')
  const [band, setBand] = useState('')

  useEffect(() => {
    fetch('/api/admin/clients').then((r) => r.json()).then((j) => { setClients(j.clients ?? []); setSummary(j.summary ?? null) }).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => (clients ?? []).filter((c) => {
    if (plan && c.plan !== plan) return false
    if (band && c.health_band !== band) return false
    if (q) { const s = q.toLowerCase(); if (!(`${c.name} ${c.email ?? ''} ${c.city ?? ''}`.toLowerCase().includes(s))) return false }
    return true
  }), [clients, q, plan, band])

  const stat = (icon: React.ReactNode, label: string, value: string | number, tone = 'text-gray-900') => (
    <Card><CardContent className="flex items-center gap-3 py-4">
      <span className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500">{icon}</span>
      <div><div className={`text-xl font-bold ${tone}`}>{value}</div><div className="text-xs text-gray-400">{label}</div></div>
    </CardContent></Card>
  )

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1300px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <p className="text-sm text-gray-500 mt-1">Your customers — plan, activity and health at a glance.</p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {stat(<Users className="w-4 h-4" />, 'Clients', summary.total)}
          {stat(<BadgeEuro className="w-4 h-4" />, 'Paying', summary.paying)}
          {stat(<HeartPulse className="w-4 h-4" />, 'Avg. health', summary.avgHealth)}
          {stat(<AlertTriangle className="w-4 h-4" />, 'At risk', summary.atRisk, summary.atRisk ? 'text-red-600' : 'text-gray-900')}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, city…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-200" />
        </div>
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-600">
          <option value="">All plans</option><option value="audit">Audit</option><option value="implementation">Implementation</option><option value="free">Free</option>
        </select>
        <select value={band} onChange={(e) => setBand(e.target.value)} className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-600">
          <option value="">All health</option><option value="at_risk">At risk</option><option value="steady">Steady</option><option value="healthy">Healthy</option>
        </select>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner className="w-6 h-6 text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users className="w-10 h-10" />} title="No clients yet"
            description="Restaurants on a paid plan (or marked as customers) appear here. Set a plan from a restaurant profile to make it a client." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <th className="px-5 py-3">Client</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Signed up</th>
                  <th className="px-4 py-3">Last active</th>
                  <th className="px-4 py-3 text-right">Audits</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => {
                  const h = HEALTH[c.health_band]
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/admin/restaurants/${c.id}`} className="font-medium text-gray-900 hover:text-emerald-700">{c.name}</Link>
                        <div className="text-xs text-gray-400">{c.email ?? '—'}{c.city ? ` · ${c.city}` : ''}</div>
                      </td>
                      <td className="px-4 py-3"><span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${PLAN_BADGE[c.plan]}`}>{PLAN_LABEL[c.plan]}</span></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{c.signed_up_at ? fmt(c.signed_up_at) : <span className="text-gray-300">not signed in</span>}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmt(c.last_active_at)}</td>
                      <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{c.audit_count}</td>
                      <td className={`px-4 py-3 text-right font-semibold tabular-nums ${scoreColor(c.visibility_score)}`}>{c.visibility_score ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${h.chip}`} title={c.health_reasons.join(' · ')}>
                          <span className={`w-1.5 h-1.5 rounded-full ${h.dot}`} />{h.label} {c.health_score}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
