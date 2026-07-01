'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Spinner, EmptyState } from '@/components/ui'
import { ShieldCheck, Plus, Trash2, UserPlus, ScrollText } from 'lucide-react'
import { useAdminT } from '@/components/admin/lang-context'

type Role = 'admin' | 'operator' | 'viewer'
interface User { id: string; email: string; role: Role; active: boolean; last_login_at: string | null; created_at: string }
interface AuditEntry { id: string; email: string | null; action: string; target: string | null; at: string }

const ROLE_BADGE: Record<Role, 'success' | 'info' | 'default'> = { admin: 'success', operator: 'info', viewer: 'default' }

export default function UsersPage() {
  const t = useAdminT().users
  const [users, setUsers] = useState<User[] | null>(null)
  const [log, setLog] = useState<AuditEntry[]>([])
  const [forbidden, setForbidden] = useState(false)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('operator')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500) }

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.status === 403) { setForbidden(true); setLoading(false); return }
    const j = await res.json()
    setUsers(j.users ?? [])
    const lr = await fetch('/api/admin/audit-log')
    if (lr.ok) setLog((await lr.json()).entries ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function create() {
    if (!email || password.length < 8) { showToast('Email and an 8+ character password are required', 'error'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      showToast(`${email} added`, 'success'); setEmail(''); setPassword(''); setRole('operator'); load()
    } catch (e) { showToast(e instanceof Error ? e.message : 'Failed', 'error') } finally { setBusy(false) }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }) })
    if (res.ok) load(); else showToast((await res.json()).error ?? 'Failed', 'error')
  }
  async function remove(id: string, who: string) {
    if (!confirm(`Delete ${who}? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
    if (res.ok) load(); else showToast((await res.json()).error ?? 'Failed', 'error')
  }

  if (forbidden) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <EmptyState icon={<ShieldCheck className="w-10 h-10" />} title={t.adminsOnly}
          description={t.adminsOnlyDesc} />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-gray-400" /> {t.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
      </div>

      {/* Create */}
      <Card className="mb-5">
        <CardHeader><CardTitle><span className="inline-flex items-center gap-2"><UserPlus className="w-4 h-4 text-gray-400" /> {t.addUser}</span></CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@finded.com" type="email"
              className="sm:col-span-2 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password (8+ chars)" type="password"
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg">
              <option value="admin">Admin</option>
              <option value="operator">Operator</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <p className="text-xs text-gray-400 mt-2">Admin = full access incl. user management · Operator = normal backoffice · Viewer = read-only.</p>
          <div className="mt-3"><Button size="sm" onClick={create} disabled={busy}>{busy ? <Spinner className="w-3.5 h-3.5 text-white" /> : <Plus className="w-3.5 h-3.5" />}Add user</Button></div>
        </CardContent>
      </Card>

      {/* Users */}
      <Card className="mb-5">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Spinner className="w-6 h-6 text-gray-400" /></div>
        ) : !users || users.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="w-10 h-10" />} title="No accounts yet" description="Add the first account above; the shared password keeps working until you do." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Last login</th>
                <th className="text-right px-5 py-3"></th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{u.email}</td>
                    <td className="px-4 py-3">
                      <select value={u.role} onChange={(e) => patch(u.id, { role: e.target.value })}
                        className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white">
                        <option value="admin">admin</option><option value="operator">operator</option><option value="viewer">viewer</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {u.active ? <Badge variant={ROLE_BADGE[u.role]}>active</Badge> : <Badge variant="default">inactive</Badge>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'never'}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => patch(u.id, { active: !u.active })}>{u.active ? 'Deactivate' : 'Activate'}</Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(u.id, u.email)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Audit log */}
      <Card>
        <CardHeader><CardTitle><span className="inline-flex items-center gap-2"><ScrollText className="w-4 h-4 text-gray-400" /> Recent admin activity</span></CardTitle></CardHeader>
        <CardContent className="pt-0">
          {log.length === 0 ? (
            <p className="text-sm text-gray-400">No activity logged yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {log.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="font-mono text-xs text-gray-500 w-36 shrink-0 truncate">{e.action}</span>
                  <span className="flex-1 text-gray-600 truncate">{e.email ?? '—'}{e.target ? ` · ${e.target}` : ''}</span>
                  <span className="text-xs text-gray-400 tabular-nums">{new Date(e.at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white z-50 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>{toast.msg}</div>
      )}
    </div>
  )
}
