'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent, Spinner, EmptyState } from '@/components/ui'
import { Button } from '@/components/ui'
import {
  Users, Search, HeartPulse, BadgeEuro, AlertTriangle,
  ChevronUp, ChevronDown, Download, Plus, X, ExternalLink,
  Mail, ChevronDown as ChevronDownIcon, Trash2,
} from 'lucide-react'

interface Client {
  id: string; name: string; city: string | null; cuisine: string | null; email: string | null
  plan: 'free' | 'beta' | 'audit' | 'implementation'; prospect_status: string
  added_at: string; signed_up_at: string | null; onboarded_at: string | null; revenue_cents: number; last_active_at: string | null
  audit_count: number; visibility_score: number | null; last_audit_at: string | null
  health_score: number; health_band: 'healthy' | 'steady' | 'at_risk'; health_reasons: string[]
}
interface Summary { total: number; paying: number; atRisk: number; avgHealth: number; revenueCents: number }
type SortKey = 'name' | 'plan' | 'signed_up_at' | 'onboarded_at' | 'last_active_at' | 'audit_count' | 'visibility_score' | 'revenue_cents' | 'health_score'

const PLANS = [
  { value: 'free', label: 'Free', badge: 'bg-gray-100 text-gray-600 border-gray-200' },
  { value: 'beta', label: 'Beta Tester', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'audit', label: 'Audit €49', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'implementation', label: 'Implementation €299', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
]
const planMeta = (v: string) => PLANS.find((p) => p.value === v) ?? PLANS[0]

const HEALTH: Record<string, { label: string; chip: string; dot: string }> = {
  healthy: { label: 'Healthy', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  steady:  { label: 'Steady',  chip: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-400' },
  at_risk: { label: 'At risk', chip: 'bg-red-50 text-red-700 border-red-200',          dot: 'bg-red-500' },
}

function SortTh({ k, sort, dir, onClick, className = '', children }: { k: SortKey; sort: SortKey; dir: 'asc' | 'desc'; onClick: (k: SortKey) => void; className?: string; children: React.ReactNode }) {
  const active = sort === k
  return (
    <th className={`py-3 ${className.includes('px-') ? '' : 'px-4'} ${className}`}>
      <button onClick={() => onClick(k)} className={`inline-flex items-center gap-1 hover:text-gray-700 ${active ? 'text-gray-700' : ''} ${className.includes('text-right') ? 'flex-row-reverse' : ''}`}>
        {children}
        {active && (dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </button>
    </th>
  )
}

const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString() : '—'
const eur = (cents: number) => cents ? `€${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'
const scoreColor = (n: number | null) => n == null ? 'text-gray-300' : n >= 60 ? 'text-emerald-600' : n >= 30 ? 'text-amber-600' : 'text-red-600'

// ── Inline plan picker ─────────────────────────────────────────────────────────
function PlanPicker({ client, onChanged }: { client: Client; onChanged: (id: string, plan: string) => void }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function pick(plan: string) {
    setOpen(false)
    setSaving(true)
    await fetch('/api/admin/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set_plan', id: client.id, plan }) })
    onChanged(client.id, plan)
    setSaving(false)
  }

  const meta = planMeta(client.plan)
  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen((o) => !o)} disabled={saving}
        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${meta.badge}`}>
        {saving ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : null}
        {meta.label}
        <ChevronDownIcon className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]">
          {PLANS.map((p) => (
            <button key={p.value} onClick={() => pick(p.value)}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 ${client.plan === p.value ? 'font-semibold' : ''}`}>
              <span className={`inline-block px-1.5 py-0.5 rounded-full border text-xs ${p.badge}`}>{p.label}</span>
              {client.plan === p.value && <span className="ml-auto text-gray-400">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Add client modal ───────────────────────────────────────────────────────────
function AddClientModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', city: '', cuisine: '', plan: 'free' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/admin/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', ...form }) })
    const j = await res.json()
    setSaving(false)
    if (!res.ok) { setError(j.error ?? 'Something went wrong'); return }
    onAdded()
    onClose()
  }

  const field = (label: string, key: keyof typeof form, placeholder = '') => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(181,104,58,0.3)]" />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Add client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {field('Restaurant name *', 'name', 'e.g. Brasserie De Zwaan')}
          {field('Email', 'email', 'owner@restaurant.com')}
          <div className="grid grid-cols-2 gap-3">
            {field('City', 'city', 'Amsterdam')}
            {field('Cuisine', 'cuisine', 'Italian')}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Plan</label>
            <select value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(181,104,58,0.3)]">
              {PLANS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving}
              style={{ background: 'linear-gradient(135deg, #C8804E 0%, #B5683A 50%, #9A5530 100%)' }}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-lg disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              Add client
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const [clients, setClients] = useState<Client[] | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [plan, setPlan] = useState('')
  const [band, setBand] = useState('')
  const [sort, setSort] = useState<SortKey>('health_score')
  const [dir, setDir] = useState<'asc' | 'desc'>('asc')
  const [showAdd, setShowAdd] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function load() {
    setLoading(true)
    fetch('/api/admin/clients').then((r) => r.json()).then((j) => { setClients(j.clients ?? []); setSummary(j.summary ?? null) }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function toggleSort(k: SortKey) {
    if (sort === k) setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSort(k); setDir(k === 'name' ? 'asc' : 'desc') }
  }

  function handlePlanChanged(id: string, newPlan: string) {
    setClients((prev) => prev ? prev.map((c) => c.id === id ? { ...c, plan: newPlan as Client['plan'] } : c) : prev)
  }

  async function handleDelete(client: Client) {
    if (!confirm(`Remove "${client.name}" from clients? This will not delete the restaurant or audit data.`)) return
    setDeletingId(client.id)
    await fetch('/api/admin/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id: client.id }) })
    setClients((prev) => prev ? prev.filter((c) => c.id !== client.id) : prev)
    setDeletingId(null)
  }

  function exportCsv(rows: Client[]) {
    const head = ['Name', 'Email', 'City', 'Cuisine', 'Plan', 'Onboarded', 'Signed up', 'Last active', 'Audits', 'Score', 'Revenue (EUR)', 'Health', 'Health score']
    const esc = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
    const lines = rows.map((c) => [
      c.name, c.email ?? '', c.city ?? '', c.cuisine ?? '', planMeta(c.plan).label,
      c.onboarded_at ? fmt(c.onboarded_at) : '', c.signed_up_at ? fmt(c.signed_up_at) : '', c.last_active_at ? fmt(c.last_active_at) : '',
      c.audit_count, c.visibility_score ?? '', (c.revenue_cents / 100).toFixed(2), HEALTH[c.health_band].label, c.health_score,
    ].map(esc).join(','))
    const csv = [head.join(','), ...lines].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a'); a.href = url; a.download = 'finded-clients.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = useMemo(() => {
    const rows = (clients ?? []).filter((c) => {
      if (plan && c.plan !== plan) return false
      if (band && c.health_band !== band) return false
      if (q) { const s = q.toLowerCase(); if (!(`${c.name} ${c.email ?? ''} ${c.city ?? ''}`.toLowerCase().includes(s))) return false }
      return true
    })
    const val = (c: Client): string | number => {
      const v = c[sort] as unknown
      if (v == null) return sort === 'name' ? '' : -1
      if (typeof v === 'string' && /_at$/.test(sort)) return new Date(v).getTime()
      return typeof v === 'number' ? v : String(v).toLowerCase()
    }
    return rows.sort((a, b) => {
      const av = val(a), bv = val(b)
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return dir === 'asc' ? cmp : -cmp
    })
  }, [clients, q, plan, band, sort, dir])

  const stat = (icon: React.ReactNode, label: string, value: string | number, tone = 'text-gray-900') => (
    <Card><CardContent className="flex items-center gap-3 py-4">
      <span className="w-9 h-9 rounded-lg bg-[rgba(181,104,58,0.08)] border border-[rgba(181,104,58,0.15)] flex items-center justify-center text-[#B5683A]">{icon}</span>
      <div><div className={`text-xl font-bold ${tone}`}>{value}</div><div className="text-xs text-gray-400">{label}</div></div>
    </CardContent></Card>
  )

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1400px] mx-auto">
      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} onAdded={load} />}

      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">Your customers — plan, activity and health at a glance.</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ background: 'linear-gradient(135deg, #C8804E 0%, #B5683A 50%, #9A5530 100%)' }}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity flex-shrink-0">
          <Plus className="w-4 h-4" /> Add client
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {stat(<Users className="w-4 h-4" />, 'Total clients', summary.total)}
          {stat(<BadgeEuro className="w-4 h-4" />, 'Paying', summary.paying)}
          {stat(<BadgeEuro className="w-4 h-4" />, 'Total revenue', eur(summary.revenueCents), 'text-emerald-600')}
          {stat(<HeartPulse className="w-4 h-4" />, 'Avg. health', summary.avgHealth)}
          {stat(<AlertTriangle className="w-4 h-4" />, 'At risk', summary.atRisk, summary.atRisk ? 'text-red-600' : 'text-gray-900')}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, city…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[rgba(181,104,58,0.3)]" />
        </div>
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-600">
          <option value="">All plans</option>
          {PLANS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select value={band} onChange={(e) => setBand(e.target.value)} className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-600">
          <option value="">All health</option><option value="at_risk">At risk</option><option value="steady">Steady</option><option value="healthy">Healthy</option>
        </select>
        <Button variant="secondary" size="sm" onClick={() => exportCsv(filtered)} disabled={filtered.length === 0}>
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner className="w-6 h-6 text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users className="w-10 h-10" />} title="No clients yet"
            description={'Click “Add client” to add your first client, or set a plan from a restaurant profile.'}
            action={<button onClick={() => setShowAdd(true)} style={{ background: 'linear-gradient(135deg, #C8804E 0%, #B5683A 50%, #9A5530 100%)' }} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg"><Plus className="w-4 h-4" />Add client</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <SortTh k="name" sort={sort} dir={dir} onClick={toggleSort} className="px-5 text-left">Client</SortTh>
                  <SortTh k="plan" sort={sort} dir={dir} onClick={toggleSort} className="text-left">Plan</SortTh>
                  <SortTh k="onboarded_at" sort={sort} dir={dir} onClick={toggleSort} className="text-left">Onboarded</SortTh>
                  <SortTh k="signed_up_at" sort={sort} dir={dir} onClick={toggleSort} className="text-left">Signed up</SortTh>
                  <SortTh k="last_active_at" sort={sort} dir={dir} onClick={toggleSort} className="text-left">Last active</SortTh>
                  <SortTh k="audit_count" sort={sort} dir={dir} onClick={toggleSort} className="text-right">Audits</SortTh>
                  <SortTh k="visibility_score" sort={sort} dir={dir} onClick={toggleSort} className="text-right">Score</SortTh>
                  <SortTh k="revenue_cents" sort={sort} dir={dir} onClick={toggleSort} className="text-right">Revenue</SortTh>
                  <SortTh k="health_score" sort={sort} dir={dir} onClick={toggleSort} className="text-left">Health</SortTh>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => {
                  const h = HEALTH[c.health_band]
                  return (
                    <tr key={c.id} className="hover:bg-[rgba(181,104,58,0.03)] transition-colors group">
                      <td className="px-5 py-3">
                        <Link href={`/admin/restaurants/${c.id}`} className="font-semibold text-gray-900 hover:text-[#B5683A] transition-colors">{c.name}</Link>
                        <div className="text-xs text-gray-400 mt-0.5">{c.email ?? '—'}{c.city ? ` · ${c.city}` : ''}{c.cuisine ? ` · ${c.cuisine}` : ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <PlanPicker client={c} onChanged={handlePlanChanged} />
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmt(c.onboarded_at)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{c.signed_up_at ? fmt(c.signed_up_at) : <span className="text-gray-300">not signed in</span>}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmt(c.last_active_at)}</td>
                      <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{c.audit_count}</td>
                      <td className={`px-4 py-3 text-right font-semibold tabular-nums ${scoreColor(c.visibility_score)}`}>{c.visibility_score ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700 tabular-nums">{eur(c.revenue_cents)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${h.chip}`} title={c.health_reasons.join(' · ')}>
                          <span className={`w-1.5 h-1.5 rounded-full ${h.dot}`} />{h.label} {c.health_score}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/dashboard/${c.id}`} target="_blank" title="View client dashboard"
                            className="p-1.5 rounded-md text-gray-400 hover:text-[#B5683A] hover:bg-[rgba(181,104,58,0.08)] transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          {c.email && (
                            <a href={`mailto:${c.email}`} title="Send email"
                              className="p-1.5 rounded-md text-gray-400 hover:text-[#B5683A] hover:bg-[rgba(181,104,58,0.08)] transition-colors">
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button onClick={() => handleDelete(c)} disabled={deletingId === c.id} title="Remove from clients"
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                            {deletingId === c.id ? <span className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin inline-block" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
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
