import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/client'
import Link from 'next/link'
import { ADMIN_COPY, type AdminLang } from '@/lib/admin-copy'

const STATUSES = [
  { value: 'not_contacted',  color: 'bg-gray-100 text-gray-600' },
  { value: 'email_sent',     color: 'bg-blue-50 text-blue-600' },
  { value: 'opened',         color: 'bg-blue-50 text-blue-600' },
  { value: 'replied',        color: 'bg-purple-50 text-purple-600' },
  { value: 'interested',     color: 'bg-amber-50 text-amber-600' },
  { value: 'demo_scheduled', color: 'bg-amber-50 text-amber-600' },
  { value: 'customer',       color: 'bg-emerald-50 text-emerald-600' },
  { value: 'lost',           color: 'bg-red-50 text-red-500' },
]

function statusInfo(value: string | null) {
  return STATUSES.find(s => s.value === value) ?? STATUSES[0]
}

async function getLeads() {
  const { data: restaurants } = await supabaseAdmin
    .from('restaurants')
    .select('id, name, city, cuisine, website')
    .order('name')

  if (!restaurants) return []

  const { data: leadStatuses } = await supabaseAdmin
    .from('lead_statuses')
    .select('*')

  const { data: latestAudits } = await supabaseAdmin
    .from('audits')
    .select('restaurant_id, id, created_at, total_prompts')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  const { data: visibilityScores } = await supabaseAdmin
    .from('visibility_scores')
    .select('audit_id, restaurant_id, visibility_score, opportunity_score')

  return restaurants.map(r => {
    const lead = leadStatuses?.find(l => l.restaurant_id === r.id)
    const audit = latestAudits?.find(a => a.restaurant_id === r.id)
    const scores = audit
      ? visibilityScores?.find(v => v.audit_id === audit.id)
      : null

    return {
      ...r,
      lead_status: lead?.status ?? 'not_contacted',
      notes: lead?.notes ?? null,
      next_followup_at: lead?.next_followup_at ?? null,
      last_contacted_at: lead?.last_contacted_at ?? null,
      audit_id: audit?.id ?? null,
      audited_at: audit?.created_at ?? null,
      visibility_score: scores?.visibility_score ?? null,
      opportunity_score: scores?.opportunity_score ?? null,
    }
  })
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const cookieStore = await cookies()
  const lang = (cookieStore.get('finded_lang')?.value ?? 'nl') as AdminLang
  const t = ADMIN_COPY[lang].leads
  const leads = await getLeads()

  const filtered = status && status !== 'all'
    ? leads.filter(l => l.lead_status === status)
    : leads

  const counts = STATUSES.reduce((acc, s) => {
    acc[s.value] = leads.filter(l => l.lead_status === s.value).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{leads.length} {t.subtitle} · {counts['customer'] ?? 0} {t.customers} · {counts['interested'] ?? 0} {t.interested}</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        <Link
          href="/admin/leads"
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !status || status === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({leads.length})
        </Link>
        {STATUSES.map(s => (
          <Link
            key={s.value}
            href={`/admin/leads?status=${s.value}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              status === s.value
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.statusLabels[s.value as keyof typeof t.statusLabels] ?? s.value} ({counts[s.value] ?? 0})
          </Link>
        ))}
      </div>

      {/* Leads table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-500">Restaurant</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">City</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Visibility</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Opportunity</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Follow-up</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Notes</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No leads found
                </td>
              </tr>
            )}
            {filtered.map(lead => {
              const s = statusInfo(lead.lead_status)
              return (
                <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{lead.name}</td>
                  <td className="px-4 py-3 text-gray-500">{lead.city}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                      {t.statusLabels[lead.lead_status as keyof typeof t.statusLabels] ?? lead.lead_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {lead.visibility_score !== null
                      ? <span className="font-medium">{Math.round(lead.visibility_score)}</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    {lead.opportunity_score !== null
                      ? (
                        <span className={`font-medium ${
                          lead.opportunity_score >= 70 ? 'text-amber-600' : 'text-gray-700'
                        }`}>
                          {Math.round(lead.opportunity_score)}
                        </span>
                      )
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {lead.next_followup_at
                      ? new Date(lead.next_followup_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">
                    {lead.notes ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {lead.audit_id ? (
                      <Link
                        href={`/admin/audits/${lead.audit_id}`}
                        className="text-xs text-blue-500 hover:underline"
                      >
                        View audit
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-300">No audit</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
