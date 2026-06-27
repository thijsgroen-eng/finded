'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button, Card, EmptyState, Spinner } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import {
  Building2, Search, Plus, PlayCircle, ExternalLink, ChevronUp, ChevronDown,
  Upload, Download, Tag, X, Filter,
} from 'lucide-react'
import Link from 'next/link'

/* ── The prospecting pipeline ───────────────────────────────────────────────
 * Every restaurant in the database carries a status. This is the spine of the
 * backoffice: it turns 35k imported restaurants into a workable sales queue.   */
interface ProspectStatusMeta { label: string; dot: string; chip: string }
const STATUS: Record<string, ProspectStatusMeta> = {
  not_audited:   { label: '🟢 Not audited',   dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  audit_queued:  { label: '🟡 Audit queued',  dot: 'bg-amber-400',   chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  audit_complete:{ label: '🔵 Audit complete',dot: 'bg-blue-500',    chip: 'bg-blue-50 text-blue-700 border-blue-200' },
  outreach_ready:{ label: '🟣 Outreach ready',dot: 'bg-purple-500',  chip: 'bg-purple-50 text-purple-700 border-purple-200' },
  contacted:     { label: '🟠 Contacted',     dot: 'bg-orange-500',  chip: 'bg-orange-50 text-orange-700 border-orange-200' },
  customer:      { label: '✅ Customer',       dot: 'bg-green-600',   chip: 'bg-green-100 text-green-800 border-green-300' },
  monitoring:    { label: '⭐ Monitoring',     dot: 'bg-yellow-400',  chip: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
}
const STATUS_ORDER = ['not_audited', 'audit_queued', 'audit_complete', 'outreach_ready', 'contacted', 'customer', 'monitoring']

interface Row {
  id: string
  name: string
  city: string | null
  cuisine: string | null
  website: string | null
  email: string | null
  prospect_status: string
  plan: string | null
  visibility_score: number | null
  last_audit_id: string | null
  last_audit_status: string | null
  last_audit_at: string | null
  audit_count: number | null
  created_at: string
}

const LIMIT = 50

function scoreColor(n: number | null) {
  if (n == null) return 'text-gray-300'
  if (n >= 60) return 'text-emerald-600'
  if (n >= 30) return 'text-amber-600'
  return 'text-red-600'
}

export default function RestaurantDatabasePage() {
  const [rows, setRows] = useState<Row[]>([])
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 })
  const [loading, setLoading] = useState(true)

  // Filters
  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [status, setStatus] = useState('')
  const [plan, setPlan] = useState('')
  const [scoreMax, setScoreMax] = useState('')
  const [scoreMin, setScoreMin] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const [sort, setSort] = useState('last_audit_at')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT), sort, dir })
    if (q) params.set('q', q)
    if (city) params.set('city', city)
    if (cuisine) params.set('cuisine', cuisine)
    if (status) params.set('prospect_status', status)
    if (plan) params.set('plan', plan)
    if (scoreMin) params.set('score_min', scoreMin)
    if (scoreMax) params.set('score_max', scoreMax)
    const res = await fetch(`/api/admin/restaurants?${params}`)
    const json = await res.json()
    setRows(json.data ?? [])
    setMeta(json.meta ?? { total: 0, page: 1, pages: 1 })
    setLoading(false)
  }, [q, city, cuisine, status, plan, scoreMin, scoreMax, sort, dir, page])

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => { fetchRows() }, 250)
    return () => { if (debounce.current) clearTimeout(debounce.current) }
  }, [fetchRows])

  useEffect(() => { setPage(1); setSelected(new Set()) }, [q, city, cuisine, status, plan, scoreMin, scoreMax])

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function toggleSort(col: string) {
    if (sort === col) setDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSort(col); setDir('desc') }
  }

  function toggleSelectAll() {
    if (selected.size === rows.length) setSelected(new Set())
    else setSelected(new Set(rows.map(r => r.id)))
  }
  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function bulk(action: string, extra: Record<string, unknown> = {}) {
    const ids = [...selected]
    if (ids.length === 0) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action, ...extra }),
      })
      if (action === 'export') {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'finded-restaurants.csv'; a.click()
        URL.revokeObjectURL(url)
        showToast(`Exported ${ids.length} restaurants`, 'success')
      } else {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        if (action === 'run_audit') showToast(`Queued ${json.queued} audits`, 'success')
        else showToast(`Updated ${json.updated} restaurants`, 'success')
        setSelected(new Set())
        fetchRows()
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Bulk action failed', 'error')
    } finally {
      setBusy(false)
      setShowStatusMenu(false)
    }
  }

  function clearFilters() {
    setQ(''); setCity(''); setCuisine(''); setStatus(''); setPlan(''); setScoreMin(''); setScoreMax('')
  }
  const hasFilters = !!(q || city || cuisine || status || plan || scoreMin || scoreMax)

  const SortHead = ({ col, children, className = '' }: { col: string; children: React.ReactNode; className?: string }) => (
    <th className={`px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide ${className}`}>
      <button onClick={() => toggleSort(col)} className="inline-flex items-center gap-1 hover:text-gray-700">
        {children}
        {sort === col && (dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </button>
    </th>
  )

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurant Database</h1>
          <p className="text-sm text-gray-500 mt-1">{meta.total.toLocaleString()} restaurants · prospecting queue</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/upload">
            <Button size="sm" variant="secondary"><Upload className="w-3.5 h-3.5" />Bulk import</Button>
          </Link>
          <Link href="/admin/new">
            <Button size="sm"><Plus className="w-3.5 h-3.5" />New restaurant</Button>
          </Link>
        </div>
      </div>

      {/* Search + quick filters */}
      <div className="flex flex-wrap gap-3 mb-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search name, website, email…" value={q}
            onChange={e => setQ(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-200" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-200 text-gray-600">
          <option value="">All statuses</option>
          {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
        </select>
        <Button size="sm" variant={showFilters ? 'primary' : 'secondary'} onClick={() => setShowFilters(v => !v)}>
          <Filter className="w-3.5 h-3.5" />Filters{hasFilters ? ' ·' : ''}
        </Button>
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <Card className="mb-4">
          <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">City</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Amsterdam" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Cuisine</label>
              <input value={cuisine} onChange={e => setCuisine(e.target.value)} placeholder="Italian" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Plan</label>
              <select value={plan} onChange={e => setPlan(e.target.value)} className={inputClass}>
                <option value="">Any</option>
                <option value="free">Free</option>
                <option value="audit">Audit (€49)</option>
                <option value="implementation">Implementation (€299)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Score min</label>
              <input value={scoreMin} onChange={e => setScoreMin(e.target.value)} type="number" min={0} max={100} placeholder="0" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Score max</label>
              <input value={scoreMax} onChange={e => setScoreMax(e.target.value)} type="number" min={0} max={100} placeholder="30" className={inputClass} />
            </div>
            <div className="flex items-end">
              <Button size="sm" variant="ghost" onClick={clearFilters} disabled={!hasFilters}>
                <X className="w-3.5 h-3.5" />Clear
              </Button>
            </div>
          </div>
          <div className="px-5 pb-4 -mt-1">
            <p className="text-xs text-gray-400">
              Example: cuisine <span className="font-medium text-gray-600">Italian</span>, city <span className="font-medium text-gray-600">Amsterdam</span>,
              score max <span className="font-medium text-gray-600">30</span>, status <span className="font-medium text-gray-600">not contacted</span> → your outreach shortlist.
            </p>
          </div>
        </Card>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3 px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <span className="text-gray-500">·</span>
          <Button size="sm" variant="secondary" onClick={() => bulk('run_audit')} disabled={busy}>
            {busy ? <Spinner className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}Run audit
          </Button>
          <div className="relative">
            <Button size="sm" variant="secondary" onClick={() => setShowStatusMenu(v => !v)} disabled={busy}>
              <Tag className="w-3.5 h-3.5" />Set status
            </Button>
            {showStatusMenu && (
              <div className="absolute z-30 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1">
                {STATUS_ORDER.map(s => (
                  <button key={s} onClick={() => bulk('set_status', { status: s })}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    {STATUS[s].label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button size="sm" variant="secondary" onClick={() => bulk('export')} disabled={busy}>
            <Download className="w-3.5 h-3.5" />Export CSV
          </Button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner className="w-6 h-6 text-gray-400" /></div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Building2 className="w-10 h-10" />}
            title="No restaurants found"
            description={hasFilters ? 'Try adjusting your filters' : 'Import restaurants or add one to get started'}
            action={<Link href="/admin/upload"><Button size="sm"><Upload className="w-4 h-4" />Bulk import</Button></Link>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" checked={selected.size === rows.length && rows.length > 0}
                        onChange={toggleSelectAll} className="rounded border-gray-300" />
                    </th>
                    <SortHead col="name" className="text-left">Restaurant</SortHead>
                    <SortHead col="prospect_status" className="text-left">Status</SortHead>
                    <SortHead col="city" className="text-left">City</SortHead>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Cuisine</th>
                    <SortHead col="visibility_score" className="text-right">Score</SortHead>
                    <SortHead col="audit_count" className="text-right">Audits</SortHead>
                    <SortHead col="last_audit_at" className="text-left">Last audit</SortHead>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map(r => {
                    const meta = STATUS[r.prospect_status] ?? STATUS.not_audited
                    return (
                      <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${selected.has(r.id) ? 'bg-gray-50' : ''}`}>
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} className="rounded border-gray-300" />
                        </td>
                        <td className="px-4 py-3">
                          {r.last_audit_id ? (
                            <Link href={`/admin/audits/${r.last_audit_id}`} className="font-medium text-gray-900 hover:text-emerald-700">{r.name}</Link>
                          ) : (
                            <span className="font-medium text-gray-900">{r.name}</span>
                          )}
                          {r.website && (
                            <a href={r.website.startsWith('http') ? r.website : `https://${r.website}`} target="_blank" rel="noreferrer"
                              className="block text-xs text-gray-400 hover:text-blue-600 mt-0.5">
                              <ExternalLink className="inline w-3 h-3 mr-0.5" />
                              {r.website.replace(/^https?:\/\//, '').slice(0, 32)}
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${meta.chip}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                            {meta.label.replace(/^\S+\s/, '')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{r.city ?? <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-3 text-gray-600">{r.cuisine ?? <span className="text-gray-300">—</span>}</td>
                        <td className={`px-4 py-3 text-right font-semibold tabular-nums ${scoreColor(r.visibility_score)}`}>
                          {r.visibility_score ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{r.audit_count || 0}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{r.last_audit_at ? formatDate(r.last_audit_at) : '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => { setSelected(new Set([r.id])); bulk('run_audit') }} disabled={busy}>
                            <PlayCircle className="w-3.5 h-3.5" />Audit
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {meta.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">Page {meta.page} of {meta.pages} · {meta.total.toLocaleString()} total</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <Button variant="secondary" size="sm" disabled={page >= meta.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white z-50 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
