'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCw, Square, Loader2 } from 'lucide-react'

/** Rerun / Stop controls for an audit (admin audit detail header). */
export function AuditControls({ auditId, status }: { auditId: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const canStop = status === 'queued' || status === 'running'

  async function act(action: 'rerun' | 'stop') {
    setBusy(action); setError('')
    try {
      const res = await fetch('/api/admin/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audit_id: auditId, action }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError(json.error ?? 'Action failed'); setBusy(null); return }
      if (action === 'rerun' && json.audit_id) router.push(`/admin/audits/${json.audit_id}`)
      else router.refresh()
    } catch {
      setError('Action failed'); setBusy(null)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {canStop && (
        <button onClick={() => act('stop')} disabled={!!busy}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50">
          {busy === 'stop' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
          Stop
        </button>
      )}
      <button onClick={() => act('rerun')} disabled={!!busy}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
        {busy === 'rerun' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
        Re-run
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
