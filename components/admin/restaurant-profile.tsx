'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Spinner, EmptyState } from '@/components/ui'
import { formatDate, formatDateTime, statusVariant } from '@/lib/utils'
import { PlanControls } from '@/components/admin/plan-controls'
import { ScoreTrend } from '@/components/admin/score-trend'
import { ClipboardList, PlayCircle, ExternalLink, Save, Tag } from 'lucide-react'

/* The prospecting pipeline — shared legend with the Restaurant Database. */
const STATUS: Record<string, { label: string; chip: string; dot: string }> = {
  not_audited:    { label: 'Not audited',    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  audit_queued:   { label: 'Audit queued',   chip: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400' },
  audit_complete: { label: 'Audit complete', chip: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500' },
  outreach_ready: { label: 'Outreach ready', chip: 'bg-purple-50 text-purple-700 border-purple-200',    dot: 'bg-purple-500' },
  contacted:      { label: 'Contacted',      chip: 'bg-orange-50 text-orange-700 border-orange-200',     dot: 'bg-orange-500' },
  customer:       { label: 'Customer',       chip: 'bg-green-100 text-green-800 border-green-300',       dot: 'bg-green-600' },
  monitoring:     { label: 'Monitoring',     chip: 'bg-yellow-50 text-yellow-800 border-yellow-200',     dot: 'bg-yellow-400' },
}
const STATUS_ORDER = ['not_audited', 'audit_queued', 'audit_complete', 'outreach_ready', 'contacted', 'customer', 'monitoring']

export interface ProfileRestaurant {
  id: string
  name: string
  city: string | null
  cuisine: string | null
  business_type: string | null
  country: string | null
  website: string | null
  domain: string | null
  email: string | null
  phone: string | null
  place_id: string | null
  plan: string | null
  report_paid: boolean | null
  preview_slug: string | null
  prospect_status: string
  tags: string[] | null
  internal_notes: string | null
  next_follow_up: string | null
  created_at: string
}
export interface ProfileAudit {
  id: string
  status: string
  created_at: string
  completed_at: string | null
  visibility_score: number | null
}

type Tab = 'overview' | 'audits' | 'crm'

function scoreColor(n: number | null) {
  if (n == null) return 'text-gray-300'
  if (n >= 60) return 'text-emerald-600'
  if (n >= 30) return 'text-amber-600'
  return 'text-red-600'
}

export function RestaurantProfile({ restaurant, audits }: { restaurant: ProfileRestaurant; audits: ProfileAudit[] }) {
  const [tab, setTab] = useState<Tab>('overview')
  const [status, setStatus] = useState(restaurant.prospect_status)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const latestScore = audits.find(a => a.visibility_score != null)?.visibility_score ?? null
  const latestAuditId = audits[0]?.id ?? null
  const tier = restaurant.plan === 'implementation' ? 'implementation'
    : (restaurant.plan === 'audit' || restaurant.report_paid) ? 'audit' : 'free'

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function runAudit() {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [restaurant.id], action: 'run_audit' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showToast('Audit queued', 'success')
      if (status === 'not_audited') setStatus('audit_queued')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to queue audit', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function quickStatus(next: string) {
    const prev = status
    setStatus(next)
    try {
      const res = await fetch(`/api/admin/restaurants/${restaurant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_status: next }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('Status updated', 'success')
    } catch (err) {
      setStatus(prev)
      showToast(err instanceof Error ? err.message : 'Failed to update', 'error')
    }
  }

  const meta = STATUS[status] ?? STATUS.not_audited
  const websiteHref = restaurant.website
    ? (restaurant.website.startsWith('http') ? restaurant.website : `https://${restaurant.website}`)
    : null

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'audits', label: `Audits (${audits.length})` },
    { key: 'crm', label: 'CRM & Outreach' },
  ]

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <Link href="/admin/restaurants" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
          ← Restaurant Database
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <h1 className="text-2xl font-bold text-gray-900">{restaurant.name}</h1>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${meta.chip}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {restaurant.city ?? '—'}
              {restaurant.cuisine ? ` · ${restaurant.cuisine}` : ''}
              {restaurant.business_type ? ` · ${restaurant.business_type}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {websiteHref && (
              <a href={websiteHref} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-md px-2.5 py-1.5">
                <ExternalLink className="w-3 h-3" />Website
              </a>
            )}
            {restaurant.preview_slug && (
              <a href={`/report/${restaurant.preview_slug}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-700 rounded-md px-2.5 py-1.5">
                <ExternalLink className="w-3 h-3" />Dashboard
              </a>
            )}
            <Button size="sm" onClick={runAudit} disabled={busy}>
              {busy ? <Spinner className="w-3.5 h-3.5 text-white" /> : <PlayCircle className="w-3.5 h-3.5" />}Run audit
            </Button>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card><CardContent className="py-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">AI Visibility</p>
          <p className={`text-2xl font-bold ${scoreColor(latestScore)}`}>{latestScore ?? '—'}<span className="text-sm text-gray-300 font-normal">/100</span></p>
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Audits</p>
          <p className="text-2xl font-bold text-gray-900">{audits.length}</p>
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Plan</p>
          <p className="text-lg font-bold text-gray-900 capitalize mt-1">{tier}</p>
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Last audit</p>
          <p className="text-sm font-semibold text-gray-700 mt-2">{audits[0] ? formatDate(audits[0].created_at) : 'Never'}</p>
        </CardContent></Card>
      </div>

      {/* Quick status switcher */}
      <div className="flex flex-wrap items-center gap-1.5 mb-5">
        <span className="text-xs font-medium text-gray-400 mr-1">Pipeline:</span>
        {STATUS_ORDER.map(s => (
          <button key={s} onClick={() => quickStatus(s)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              status === s ? STATUS[s].chip : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}>
            {STATUS[s].label}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-5">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab restaurant={restaurant} />}
      {tab === 'audits' && <AuditsTab audits={audits} latestAuditId={latestAuditId} />}
      {tab === 'crm' && <CrmTab restaurant={restaurant} tier={tier} onToast={showToast} />}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white z-50 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function Fact({ label, value, href }: { label: string; value: string | null; href?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      {value ? (
        href ? <a href={href} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline break-all">{value}</a>
             : <p className="text-sm text-gray-800 break-words">{value}</p>
      ) : <p className="text-sm text-gray-300">—</p>}
    </div>
  )
}

function OverviewTab({ restaurant }: { restaurant: ProfileRestaurant }) {
  const websiteHref = restaurant.website
    ? (restaurant.website.startsWith('http') ? restaurant.website : `https://${restaurant.website}`)
    : null
  return (
    <>
      <Card className="mb-5">
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
          <Fact label="City" value={restaurant.city} />
          <Fact label="Cuisine" value={restaurant.cuisine} />
          <Fact label="Business type" value={restaurant.business_type} />
          <Fact label="Country" value={restaurant.country} />
          <Fact label="Website" value={restaurant.website} href={websiteHref} />
          <Fact label="Domain" value={restaurant.domain} />
          <Fact label="Email" value={restaurant.email} href={restaurant.email ? `mailto:${restaurant.email}` : null} />
          <Fact label="Phone" value={restaurant.phone} />
          <Fact label="Google Place ID" value={restaurant.place_id} />
          <Fact label="Added" value={formatDate(restaurant.created_at)} />
        </CardContent>
      </Card>
      <ScoreTrend restaurantId={restaurant.id} />
    </>
  )
}

function AuditsTab({ audits, latestAuditId }: { audits: ProfileAudit[]; latestAuditId: string | null }) {
  if (audits.length === 0) {
    return (
      <Card>
        <EmptyState icon={<ClipboardList className="w-10 h-10" />} title="No audits yet"
          description="Run an audit to measure how AI recommends this restaurant." />
      </Card>
    )
  }
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Score</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Completed</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {audits.map(a => (
              <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 text-gray-700">
                  {formatDateTime(a.created_at)}
                  {a.id === latestAuditId && <span className="ml-2 text-xs text-gray-400">latest</span>}
                </td>
                <td className="px-4 py-3"><Badge variant={statusVariant(a.status) as 'success' | 'warning' | 'danger' | 'default'}>{a.status}</Badge></td>
                <td className={`px-4 py-3 text-right font-semibold tabular-nums ${scoreColor(a.visibility_score)}`}>{a.visibility_score ?? '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{a.completed_at ? formatDate(a.completed_at) : '—'}</td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/admin/audits/${a.id}`} className="text-xs font-medium text-gray-600 hover:text-gray-900">View →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function CrmTab({ restaurant, tier, onToast }: { restaurant: ProfileRestaurant; tier: string; onToast: (m: string, t: 'success' | 'error') => void }) {
  const [tags, setTags] = useState((restaurant.tags ?? []).join(', '))
  const [notes, setNotes] = useState(restaurant.internal_notes ?? '')
  const [followUp, setFollowUp] = useState(restaurant.next_follow_up ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/restaurants/${restaurant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: tags.split(',').map(s => s.trim()).filter(Boolean),
          internal_notes: notes,
          next_follow_up: followUp || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      onToast('Saved', 'success')
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"

  return (
    <>
      {/* Dashboard tier */}
      <div className="mb-5">
        <PlanControls restaurantId={restaurant.id} previewSlug={restaurant.preview_slug}
          current={tier as 'free' | 'audit' | 'implementation'} />
      </div>

      <Card>
        <CardHeader><CardTitle>Outreach & notes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
              <Tag className="w-3 h-3" />Tags <span className="font-normal text-gray-400">(comma-separated)</span>
            </label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="hot lead, michelin, replied" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Next follow-up</label>
            <input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)} className={inputClass + ' max-w-[200px]'} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Internal notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={6}
              placeholder="Call notes, objections, context…" className={inputClass} />
          </div>
          <div>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Spinner className="w-3.5 h-3.5 text-white" /> : <Save className="w-3.5 h-3.5" />}Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
