'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge, Button, Card, EmptyState, Spinner } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { UtensilsCrossed, Search, Plus, PlayCircle, ExternalLink, X } from 'lucide-react'
import Link from 'next/link'

interface Restaurant {
  id: string
  name: string
  website: string | null
  city: string
  cuisine: string | null
  email: string | null
  created_at: string
}

const EMPTY_FORM = { name: '', city: '', website: '', cuisine: '', email: '' }

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [auditingId, setAuditingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const limit = 25

  const fetchRestaurants = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ q: search, page: String(page), limit: String(limit) })
    const res = await fetch(`/api/restaurants?${params}`)
    const json = await res.json()
    setRestaurants(json.data ?? [])
    setTotal(json.meta?.total ?? 0)
    setLoading(false)
  }, [search, page])

  useEffect(() => { fetchRestaurants() }, [fetchRestaurants])
  useEffect(() => { setPage(1) }, [search])

  async function triggerAudit(restaurantId: string, name: string) {
    setAuditingId(restaurantId)
    try {
      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: restaurantId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showToast(`Audit queued for ${name}`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to queue audit', 'error')
    } finally {
      setAuditingId(null)
    }
  }

  async function handleAddRestaurant() {
    if (!form.name || !form.city) {
      showToast('Name and city are required', 'error')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showToast(`${form.name} added successfully`, 'success')
      setForm(EMPTY_FORM)
      setShowForm(false)
      fetchRestaurants()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add restaurant', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddAndAudit() {
    if (!form.name || !form.city) {
      showToast('Name and city are required', 'error')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      const auditRes = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: json.data.id }),
      })
      const auditJson = await auditRes.json()
      if (!auditRes.ok) throw new Error(auditJson.error)

      showToast(`${form.name} added and audit queued`, 'success')
      setForm(EMPTY_FORM)
      setShowForm(false)
      fetchRestaurants()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurants</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total restaurants</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => { setShowForm(!showForm); setForm(EMPTY_FORM) }}>
            <Plus className="w-4 h-4" />
            Add restaurant
          </Button>
          <Link href="/admin/upload">
            <Button size="sm" variant="ghost">Bulk upload</Button>
          </Link>
        </div>
      </div>

      {showForm && (
        <Card className="mb-5">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Add a restaurant</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-5 py-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Restaurant name *</label>
                <input type="text" placeholder="Le Petit Bistro" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">City *</label>
                <input type="text" placeholder="Paris" value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Website URL</label>
                <input type="text" placeholder="https://lepetitbistro.com" value={form.website}
                  onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Cuisine type</label>
                <input type="text" placeholder="French, Italian…" value={form.cuisine}
                  onChange={e => setForm(f => ({ ...f, cuisine: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                <input type="text" placeholder="info@restaurant.com" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddRestaurant} disabled={saving}>
                {saving ? <Spinner className="w-3.5 h-3.5 text-white" /> : <Plus className="w-3.5 h-3.5" />}
                Add restaurant
              </Button>
              <Button size="sm" variant="secondary" onClick={handleAddAndAudit} disabled={saving}>
                {saving ? <Spinner className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                Add & run audit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search by name, city, email, website…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-200" />
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="w-6 h-6 text-gray-400" />
          </div>
        ) : restaurants.length === 0 ? (
          <EmptyState
            icon={<UtensilsCrossed className="w-10 h-10" />}
            title="No restaurants found"
            description={search ? 'Try a different search term' : 'Add a restaurant or upload a CSV to get started'}
            action={<Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" />Add restaurant</Button>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Restaurant</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">City</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Cuisine</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Website</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Added</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {restaurants.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{r.name}</p>
                        {r.email && <p className="text-xs text-gray-400 mt-0.5">{r.email}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.city}</td>
                      <td className="px-4 py-3">
                        {r.cuisine ? <Badge variant="outline">{r.cuisine}</Badge> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.website ? (
                          <a href={r.website.startsWith('http') ? r.website : `https://${r.website}`} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs">
                            <ExternalLink className="w-3 h-3" />
                            {r.website.replace(/^https?:\/\//, '').slice(0, 30)}
                          </a>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(r.created_at)}</td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => triggerAudit(r.id, r.name)} disabled={auditingId === r.id}>
                          {auditingId === r.id ? <Spinner className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                          Audit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
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
