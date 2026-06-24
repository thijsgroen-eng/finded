'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { Download, Mail, Loader2, Check } from 'lucide-react'

const PLANS = [
  { key: 'free', name: 'Free AI visibility check', price: '€0', desc: 'Score, mentions, basic competitors, summary — the lead magnet.' },
  { key: 'audit', name: 'Restaurant AI Audit', price: '€49', desc: 'Full analysis: all models, competitor comparison, website signals, recommendations.' },
  { key: 'implementation', name: 'Implementation plan', price: '€299', desc: 'The prioritised fixes written up as an action plan.' },
] as const

type Lang = 'nl' | 'en'

/** Download or email any of the three plan PDFs for an audit. */
export function ReportSender({ auditId, defaultEmail }: { auditId: string; defaultEmail?: string | null }) {
  const [email, setEmail] = useState(defaultEmail ?? '')
  const [lang, setLang] = useState<Lang>('nl')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ plan: string; text: string; ok: boolean } | null>(null)

  const dl = (plan: string) => `/api/report/${auditId}/pdf?plan=${plan}&lang=${lang}`

  async function send(plan: string) {
    setBusy(plan); setMsg(null)
    try {
      const res = await fetch('/api/admin/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audit_id: auditId, plan, lang, to: email || undefined }),
      })
      const j = await res.json().catch(() => ({}))
      setMsg({ plan, ok: res.ok, text: res.ok ? `Sent to ${j.to}` : (j.error ?? 'Failed to send') })
    } catch {
      setMsg({ plan, ok: false, text: 'Failed to send' })
    }
    setBusy(null)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle>Reports</CardTitle>
          {/* language toggle */}
          <div className="flex items-center gap-1 text-xs">
            {(['nl', 'en'] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-2.5 py-1 rounded-md font-medium uppercase ${lang === l ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* recipient */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Email recipient</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@restaurant.nl"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
          <p className="text-xs text-gray-400 mt-1">Defaults to the email on the public request. Emails send only when RESEND_API_KEY is configured.</p>
        </div>

        {PLANS.map((p) => (
          <div key={p.key} className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{p.name} <span className="text-gray-400 font-normal">· {p.price}</span></p>
                <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a href={dl(p.key)} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50">
                  <Download className="w-3.5 h-3.5" /> PDF
                </a>
                <button onClick={() => send(p.key)} disabled={!!busy}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50">
                  {busy === p.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />} Email
                </button>
              </div>
            </div>
            {msg?.plan === p.key && (
              <p className={`text-xs mt-2 inline-flex items-center gap-1 ${msg.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                {msg.ok && <Check className="w-3 h-3" />}{msg.text}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
