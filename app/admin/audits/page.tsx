'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge, Card, EmptyState, Spinner, Button } from '@/components/ui'
import { formatDateTime, statusVariant } from '@/lib/utils'
import { ClipboardList, RefreshCw, ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface AuditRow {
  id: string
  status: string
  created_at: string
  completed_at: string | null
  error_message: string | null
  restaurant: { id: string; name: string; city: string } | null
}

const STATUS_FILTERS = ['all', 'queued', 'running', 'completed', 'failed']

export default function AuditsPage() {
  const [audits, setAudits] = useState<AuditRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const limit = 25

  const fetchAudits = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    })
    if (statusFilter !== 'all') params.set('status', statusFilter)

    const res = await fetch(`/api/audits?${params}`)
    const json = await res.json()
    setAudits(json.data ?? [])
    setTotal(json.meta?.total ?? 0)
    setLoading(false)
  }, [page, statusFilter])

  useEffect(() => { fetchAudits() }, [fetchAudits])
  useEffect(() => { setPage(1) }, [statusFilter])

  // Auto-refresh every 10s if there are running/queued audits
  useEffect(() => {
    const hasActive = audits.some((a) => a.status === 'running' || a.status === 'queued')
    if (!hasActive) return
    const t = setInterval(fetchAudits, 10_000)
    return () => clearInterval(t)
  }, [audits, fetchAudits])

  async function processQueue() {
    setProcessing(true)
    try {
      const res = await fetch('/api/queue/process', {
        method: 'POST',
        headers: { 'x-cron-secret': '' },
      })
      const json = await res.json()
      setToast(json.message ?? 'Processing started')
      setTimeout(fetchAudits, 2000)
    } catch {
      setToast('Failed to trigger queue')
    } finally {
      setProcessing(false)
      setTimeout(() => setToast(null), 3000)
    }
  }

  const totalPages = Math.ceil(total / limit)

  function durationLabel(audit: AuditRow): string {
    if (!audit.completed_at || !audit.created_at) return '—'
    const ms = new Date(audit.completed_at).getTime() - new Date(audit.created_at).getTime()
    const secs = Math.round(ms / 1000)
    if (secs < 60) return `${secs}s`
    return `${Math.round(secs / 60)}m`
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audits</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total audits</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchAudits}>
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={processQueue} disabled={processing}>
            {processing ? <Spinner className="w-3.5 h-3.5 text-white" /> : <Loader2 className="w-3.5 h-3.5" />}
            Process queue
          </Button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
              statusFilter === s
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="w-6 h-6 text-gray-400" />
          </div>
        ) : audits.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="w-10 h-10" />}
            title="No audits found"
            description="Trigger an audit from the Restaurants page"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Restaurant</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Started</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Duration</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {audits.map((audit) => (
                    <tr key={audit.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">
                          {audit.restaurant?.name ?? 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {audit.restaurant?.city ?? ''}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {audit.status === 'running' && (
                            <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                          )}
                          <Badge variant={statusVariant(audit.status) as 'success' | 'warning' | 'danger' | 'info' | 'default'}>
                            {audit.status}
                          </Badge>
                        </div>
                        {audit.error_message && (
                          <p className="text-xs text-red-500 mt-1 truncate max-w-xs" title={audit.error_message}>
                            {audit.error_message}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {formatDateTime(audit.created_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {durationLabel(audit)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {audit.status === 'completed' && (
                          <Link
                            href={`/admin/audits/${audit.id}`}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            View results
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                    Previous
                  </Button>
                  <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {toast && (
        <div className="fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white bg-gray-900 z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
