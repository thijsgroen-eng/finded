'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { Loader2, Check, ExternalLink } from 'lucide-react'

type Plan = 'free' | 'audit' | 'implementation'
const PLANS: { key: Plan; label: string; price: string; desc: string }[] = [
  { key: 'free', label: 'Free', price: '€0', desc: 'Snapshot dashboard only.' },
  { key: 'audit', label: 'Full audit', price: '€49', desc: 'Unlocks the full analysis & PDF.' },
  { key: 'implementation', label: 'Implementation', price: '€299', desc: 'Unlocks the Implementation Centre.' },
]

/** Set a restaurant's dashboard tier and open the live customer dashboard. */
export function PlanControls({ restaurantId, current, previewSlug }: { restaurantId: string; current: Plan; previewSlug: string | null }) {
  const router = useRouter()
  const [plan, setPlan] = useState<Plan>(current)
  const [busy, setBusy] = useState<Plan | null>(null)
  const [saved, setSaved] = useState(false)

  async function set(next: Plan) {
    if (next === plan && !busy) return
    setBusy(next); setSaved(false)
    try {
      const res = await fetch('/api/admin/restaurant-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: restaurantId, plan: next }),
      })
      if (res.ok) { setPlan(next); setSaved(true); setTimeout(() => setSaved(false), 2000); router.refresh() }
    } finally { setBusy(null) }
  }

  return (
    <Card className="mb-5">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle>Customer dashboard</CardTitle>
          {previewSlug
            ? <a href={`/report/${previewSlug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-700 rounded-md px-3 py-1.5"><ExternalLink className="w-3.5 h-3.5" /> Open dashboard</a>
            : <span className="text-xs text-gray-400">No preview link yet</span>}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-gray-500 mb-3">This is what the customer sees. Set the tier to unlock sections (normally set automatically on payment).</p>
        <div className="grid sm:grid-cols-3 gap-2">
          {PLANS.map((p) => {
            const active = plan === p.key
            return (
              <button key={p.key} onClick={() => set(p.key)} disabled={!!busy}
                className={`text-left rounded-lg border p-3 transition-colors disabled:opacity-60 ${active ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">{p.label}</span>
                  {busy === p.key ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" /> : active ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <span className="text-xs text-gray-400">{p.price}</span>}
                </div>
                <p className="text-xs text-gray-500 mt-1">{p.desc}</p>
              </button>
            )
          })}
        </div>
        {saved && <p className="text-xs text-emerald-600 mt-2">Tier updated — the customer dashboard now reflects it.</p>}
      </CardContent>
    </Card>
  )
}
