'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Sparkles, Mail, Archive } from 'lucide-react'

/** Per-request action buttons for the admin Requests list. */
export function RequestActions({ id, status, auditId }: {
  id: string; status: string; auditId: string | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function setStatus(next: string) {
    setBusy(next); setError('')
    const res = await fetch('/api/admin/requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: next }),
    })
    setBusy(null)
    if (res.ok) router.refresh()
    else setError('Action failed')
  }

  async function createAudit() {
    setBusy('audit'); setError('')
    const res = await fetch('/api/admin/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'create_audit' }),
    })
    const json = await res.json().catch(() => ({}))
    setBusy(null)
    if (res.ok && json.audit_id) router.push(`/admin/audits/${json.audit_id}`)
    else setError(json.error ?? 'Could not create audit')
  }

  const Btn = ({ k, onClick, children }: { k: string; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} disabled={!!busy}
      className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
      {busy === k ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : children}
    </button>
  )

  return (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      {auditId ? (
        <Link href={`/admin/audits/${auditId}`} className="text-xs font-medium text-blue-500 hover:underline">View audit →</Link>
      ) : (
        <Btn k="audit" onClick={createAudit}><Sparkles className="w-3.5 h-3.5" /> Create audit</Btn>
      )}
      {status !== 'contacted' && status !== 'audit_created' && (
        <Btn k="contacted" onClick={() => setStatus('contacted')}><Mail className="w-3.5 h-3.5" /> Mark contacted</Btn>
      )}
      {status !== 'archived' && (
        <Btn k="archived" onClick={() => setStatus('archived')}><Archive className="w-3.5 h-3.5" /> Archive</Btn>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
