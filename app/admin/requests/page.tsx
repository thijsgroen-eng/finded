import { supabaseAdmin } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils'
import { Badge } from '@/components/ui'
import { displayCity } from '@/lib/engine/dashboard'
import { RequestActions } from '@/components/admin/request-actions'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning'> = {
  new_request: 'warning', contacted: 'info', audit_created: 'success', archived: 'default',
}
const STATUS_LABEL: Record<string, string> = {
  new_request: 'New', contacted: 'Contacted', audit_created: 'Audit created', archived: 'Archived',
}

async function getRequests(status?: string) {
  let q = supabaseAdmin.from('audit_requests').select('*').order('created_at', { ascending: false })
  if (status && status !== 'all') q = q.eq('status', status)
  const { data } = await q
  return data ?? []
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const requests = await getRequests(status)
  const newCount = (await getRequests('new_request')).length

  const filters = ['all', 'new_request', 'contacted', 'audit_created', 'archived']

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit requests</h1>
        <p className="text-sm text-gray-500 mt-1">
          Submitted from the public funnel at <code className="text-xs bg-gray-100 px-1 rounded">/audit</code>.
          {newCount > 0 && <> · <strong>{newCount}</strong> new</>}
        </p>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {filters.map((f) => (
          <Link key={f} href={f === 'all' ? '/admin/requests' : `/admin/requests?status=${f}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              (status ?? 'all') === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {f === 'all' ? 'All' : STATUS_LABEL[f]}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Restaurant</th>
              <th className="px-4 py-3 font-medium">Website</th>
              <th className="px-4 py-3 font-medium">City</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Received</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No requests yet.</td></tr>
            )}
            {requests.map((r) => (
              <tr key={r.id} className="border-b border-gray-50 last:border-0 align-top">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {r.restaurant_name || <span className="text-gray-400">—</span>}
                  {r.note && <p className="text-xs text-gray-400 font-normal mt-0.5 max-w-[200px] truncate" title={r.note}>{r.note}</p>}
                </td>
                <td className="px-4 py-3">
                  <a href={r.website.startsWith('http') ? r.website : `https://${r.website}`} target="_blank" rel="noreferrer"
                    className="text-blue-500 hover:underline">{r.domain ?? r.website}</a>
                </td>
                <td className="px-4 py-3 text-gray-500">{displayCity(r.city)}</td>
                <td className="px-4 py-3 text-gray-600">
                  <a href={`mailto:${r.email}`} className="hover:underline">{r.email}</a>
                  {r.phone && <p className="text-xs text-gray-400">{r.phone}</p>}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[r.status] ?? 'default'}>{STATUS_LABEL[r.status] ?? r.status}</Badge></td>
                <td className="px-4 py-3"><RequestActions id={r.id} status={r.status} auditId={r.audit_id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
