'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge, Button, Card, EmptyState, Spinner } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { Building2, Search, Plus, PlayCircle, ExternalLink, X, Pencil } from 'lucide-react'
import Link from 'next/link'

interface Entity {
  id: string
  name: string
  website: string | null
  city: string
  cuisine: string | null
  business_type: string | null
  subtypes: string[] | null
  email: string | null
  phone: string | null
  created_at: string
}

const BUSINESS_TYPES = [
  'restaurant', 'dentist', 'lawyer', 'hotel', 'agency',
  'saas', 'ecommerce', 'consultant', 'other'
]

const EMPTY_FORM = {
  name: '', city: '', website: '', business_type: 'restaurant',
  cuisine: '', email: '', phone: ''
}

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [page, setPage] = useState(1)
  const [auditingId, setAuditingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [editSaving, setEditSaving] = useState(false)

  const limit = 25

  const fetchEntities = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      q: search, page: String(page), limit: String(limit),
      ...(filterType ? { business_type: filterType } : {})
    })
    const res = await fetch(`/api/restaurants?${params}`)
    const json = await res.json()
    setEntities(json.data ?? [])
    setTotal(json.meta?.total ?? 0)
    setLoading(false)
  }, [search, page, filterType])

  useEffect(() => { fetchEntities() }, [fetchEntities])
  useEffect(() => { setPage(1) }, [search, filterType])

  function openEdit(e: Entity) {
    setEditingEntity(e)
    setEditForm({
      name: e.name ?? '',
      city: e.city ?? '',
      website: e.website ?? '',
      business_type: e.business_type ?? 'restaurant',
      cuisine: e.cuisine ?? '',
      email: e.email ?? '',
      phone: e.phone ?? '',
    })
  }

  async function handleSaveEdit() {
    if (!editingEntity) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/restaurants/${editingEntity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showToast(`${editForm.name} updated`, 'success')
      setEditingEntity(null)
      fetchEntities()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update', 'error')
    } finally {
      setEditSaving(false)
    }
  }

  async function triggerAudit(id: string, name: string) {
    setAuditingId(id)
    try {
      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: id }),
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

  async function handleAdd() {
    if (!form.name || !form.city) { showToast('Name and city are required', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showToast(`${form.name} added`, 'success')
      setForm(EMPTY_FORM)
      setShowForm(false)
      fetchEntities()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddAndAudit() {
    if (!form.name || !form.city) { showToast('Name and city are required', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      const entityId = json.data.id
      await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: entityId }),
      })
      showToast(`${form.name} added and audit queued`, 'success')
      setForm(EMPTY_FORM)
      setShowForm(false)
      fetchEntities()
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
  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-200"
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5"

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entities</h1>
          <p className="text-sm text-gray-500 mt-1">{total} entities · restaurants first (other types supported internally)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          <Plus className="w-3.5 h-3.5" />
          Add entity
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <Card className="mb-5">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Add new entity</h3>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-5 py-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelClass}>Business name *</label>
                <input type="text" placeholder="Acme Dental" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>City *</label>
                <input type="text" placeholder="Amsterdam" value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Business type *</label>
                <select value={form.business_type}
                  onChange={e => setForm(f => ({ ...f, business_type: e.target.value }))}
                  className={inputClass}>
                  {BUSINESS_TYPES.map(t => (
                    <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  {form.business_type === 'restaurant' ? 'Cuisine type' :
                   form.business_type === 'lawyer' ? 'Practice area' :
                   form.business_type === 'dentist' ? 'Specialty' : 'Category / specialty'}
                </label>
                <input type="text" placeholder={
                  form.business_type === 'restaurant' ? 'French, Italian…' :
                  form.business_type === 'lawyer' ? 'Employment, Corporate…' :
                  form.business_type === 'dentist' ? 'Implants, Whitening…' : 'Main specialty'
                } value={form.cuisine}
                  onChange={e => setForm(f => ({ ...f, cuisine: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Website URL</label>
                <input type="text" placeholder="https://example.com" value={form.website}
                  onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Contact email</label>
                <input type="email" placeholder="info@example.com" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving}>
                {saving ? <Spinner className="w-3.5 h-3.5 text-white" /> : <Plus className="w-3.5 h-3.5" />}
                Add entity
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

      {/* Edit modal */}
      {editingEntity && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Edit entity</h3>
              <button onClick={() => setEditingEntity(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className={labelClass}>Business name *</label>
                  <input type="text" value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>City *</label>
                  <input type="text" value={editForm.city}
                    onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Business type</label>
                  <select value={editForm.business_type}
                    onChange={e => setEditForm(f => ({ ...f, business_type: e.target.value }))}
                    className={inputClass}>
                    {BUSINESS_TYPES.map(t => (
                      <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Category / specialty</label>
                  <input type="text" value={editForm.cuisine}
                    onChange={e => setEditForm(f => ({ ...f, cuisine: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Website URL</label>
                  <input type="text" value={editForm.website}
                    onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Contact email</label>
                  <input type="email" value={editForm.email}
                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className={inputClass} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} disabled={editSaving}>
                  {editSaving ? <Spinner className="w-3.5 h-3.5 text-white" /> : null}
                  Save changes
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingEntity(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search + filter bar */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by name, city, email…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-200" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-200 text-gray-600">
          <option value="">All types</option>
          {BUSINESS_TYPES.map(t => (
            <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner className="w-6 h-6 text-gray-400" /></div>
        ) : entities.length === 0 ? (
          <EmptyState
            icon={<Building2 className="w-10 h-10" />}
            title="No entities found"
            description={search || filterType ? 'Try a different search or filter' : 'Add an entity or upload a CSV to get started'}
            action={<Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" />Add entity</Button>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">City</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Website</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Added</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {entities.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{e.name}</p>
                        {e.email && <p className="text-xs text-gray-400 mt-0.5">{e.email}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                          {e.business_type ?? 'restaurant'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{e.city}</td>
                      <td className="px-4 py-3">
                        {e.cuisine
                          ? <Badge variant="outline">{e.cuisine}</Badge>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {e.website ? (
                          <a href={e.website.startsWith('http') ? e.website : `https://${e.website}`}
                            target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs">
                            <ExternalLink className="w-3 h-3" />
                            {e.website.replace(/^https?:\/\//, '').slice(0, 28)}
                          </a>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(e.created_at)}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
                            <Pencil className="w-3.5 h-3.5" />Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => triggerAudit(e.id, e.name)} disabled={auditingId === e.id}>
                            {auditingId === e.id ? <Spinner className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                            Audit
                          </Button>
                        </div>
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
