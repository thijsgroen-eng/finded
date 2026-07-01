'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui'
import { Loader2, Check, Globe, User, Cpu, Coins } from 'lucide-react'
import { useAdminT } from '@/components/admin/lang-context'

type ProviderKey = 'openai' | 'anthropic' | 'gemini' | 'perplexity'
interface Settings {
  defaultLanguage: 'nl' | 'en'
  forceLanguage: boolean
  contactEmail: string
  founderName: string
  providers: Record<ProviderKey, boolean>
  grounded: boolean
  maxPrompts: number
  samples: number
  groundedCallCents: number
  ungroundedCallCents: number
  dailyBudgetCents: number
  providerTimeoutMs: number
  adaptiveExecution: boolean
  adaptiveStopOnMentions: number
}

const PROVIDER_LABELS: Record<ProviderKey, string> = {
  openai: 'ChatGPT (OpenAI)', anthropic: 'Claude (Anthropic)', gemini: 'Gemini (Google)', perplexity: 'Perplexity',
}

export default function SettingsPage() {
  const t = useAdminT().settings
  const [s, setS] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((j) => setS(j.settings))
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    if (!s) return
    setSaving(true); setSaved(false)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s),
      })
      const j = await res.json()
      if (j.settings) setS(j.settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((prev) => prev ? { ...prev, [k]: v } : prev)

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
      </div>

      {loading || !s ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-10"><Loader2 className="w-4 h-4 animate-spin" /> {t.loading}</div>
      ) : (
        <div className="space-y-5">
          {/* Language */}
          <Card>
            <CardHeader>
              <CardTitle><span className="inline-flex items-center gap-2"><Globe className="w-4 h-4 text-gray-400" /> Language</span></CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Default language for reports &amp; audits</label>
                <div className="flex gap-2">
                  {(['nl', 'en'] as const).map((l) => (
                    <button key={l} onClick={() => set('defaultLanguage', l)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border ${s.defaultLanguage === l ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
                      {l === 'nl' ? 'Nederlands' : 'English'}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={s.forceLanguage} onChange={(e) => set('forceLanguage', e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300" />
                <span className="text-sm text-gray-700">
                  Always use this language
                  <span className="block text-xs text-gray-400 mt-0.5">When on, every report and audit uses the default language above, ignoring the restaurant&rsquo;s country. Turn off to pick the language per restaurant by country (NL/BE → Dutch, else English).</span>
                </span>
              </label>
            </CardContent>
          </Card>

          {/* AI providers */}
          <Card>
            <CardHeader>
              <CardTitle><span className="inline-flex items-center gap-2"><Cpu className="w-4 h-4 text-gray-400" /> AI providers</span></CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <p className="text-xs text-gray-400">Switch a provider off to skip it in audits (e.g. to save cost) without removing its API key. A provider with no key configured is skipped automatically. At least one must stay on.</p>
              {(Object.keys(PROVIDER_LABELS) as ProviderKey[]).map((k) => {
                const on = s.providers[k]
                const enabledCount = (Object.keys(s.providers) as ProviderKey[]).filter((x) => s.providers[x]).length
                const lastOne = on && enabledCount === 1
                return (
                  <label key={k} className={`flex items-center justify-between gap-3 py-1.5 ${lastOne ? 'opacity-60' : 'cursor-pointer'}`}>
                    <span className="text-sm text-gray-700">{PROVIDER_LABELS[k]}</span>
                    <input type="checkbox" checked={on} disabled={lastOne}
                      onChange={(e) => set('providers', { ...s.providers, [k]: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300" />
                  </label>
                )
              })}
            </CardContent>
          </Card>

          {/* Audit & cost */}
          <Card>
            <CardHeader>
              <CardTitle><span className="inline-flex items-center gap-2"><Coins className="w-4 h-4 text-gray-400" /> Audit &amp; cost</span></CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={s.grounded} onChange={(e) => set('grounded', e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-gray-300" />
                <span className="text-sm text-gray-700">
                  Live web-search grounding
                  <span className="block text-xs text-gray-400 mt-0.5">Each model call also searches the web (closer to how people really use AI), but search fees make audits ~10× more expensive. Turn off to measure the models&rsquo; base answers far more cheaply.</span>
                </span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Prompts per audit</label>
                  <input type="number" min={1} max={64} value={s.maxPrompts} onChange={(e) => set('maxPrompts', Math.max(1, Math.min(64, Number(e.target.value) || 1)))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Samples per prompt</label>
                  <input type="number" min={1} max={5} value={s.samples} onChange={(e) => set('samples', Math.max(1, Math.min(5, Number(e.target.value) || 1)))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                </div>
              </div>
              {(() => {
                const enabled = Object.values(s.providers).filter(Boolean).length || 1
                const calls = enabled * s.maxPrompts * s.samples
                const perAudit = calls * ((s.grounded ? 0.03 : 0.0015) + 0.002) + 0.02
                return (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                    <div className="font-medium">≈ ${perAudit.toFixed(2)} per audit · ${(perAudit * 100).toFixed(0)} for 100</div>
                    <div className="text-xs text-gray-400 mt-1">{enabled} provider{enabled === 1 ? '' : 's'} × {s.maxPrompts} prompts × {s.samples} sample{s.samples === 1 ? '' : 's'} = ~{calls} calls/audit, grounding {s.grounded ? 'on' : 'off'}. Rough estimate — verify with provider billing.</div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          {/* Cost controls (#10) */}
          <Card>
            <CardHeader>
              <CardTitle><span className="inline-flex items-center gap-2"><Coins className="w-4 h-4 text-gray-400" /> Cost controls</span></CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <p className="text-xs text-gray-400">A hard daily cap on estimated audit spend. When the next audit&rsquo;s estimate would push today&rsquo;s spend over the cap, it&rsquo;s held back as <span className="font-medium">incomplete</span> with a clear message. Set to 0 to disable the cap.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Daily budget (€)</label>
                  <input type="number" min={0} step={1} value={(s.dailyBudgetCents / 100).toString()}
                    onChange={(e) => set('dailyBudgetCents', Math.max(0, Math.round((Number(e.target.value) || 0) * 100)))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                  <p className="text-xs text-gray-400 mt-1">{s.dailyBudgetCents === 0 ? 'No cap (disabled).' : `Caps spend at €${(s.dailyBudgetCents / 100).toFixed(0)}/day.`}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Per-call timeout (seconds)</label>
                  <input type="number" min={5} max={600} value={Math.round(s.providerTimeoutMs / 1000)}
                    onChange={(e) => set('providerTimeoutMs', Math.max(5000, Math.min(600000, (Number(e.target.value) || 90) * 1000)))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                  <p className="text-xs text-gray-400 mt-1">A hung provider no longer blocks the rest.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Est. grounded call (€ cents)</label>
                  <input type="number" min={0} step={0.5} value={s.groundedCallCents}
                    onChange={(e) => set('groundedCallCents', Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Est. ungrounded call (€ cents)</label>
                  <input type="number" min={0} step={0.5} value={s.ungroundedCallCents}
                    onChange={(e) => set('ungroundedCallCents', Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Adaptive execution (#5) */}
          <Card>
            <CardHeader>
              <CardTitle><span className="inline-flex items-center gap-2"><Cpu className="w-4 h-4 text-gray-400" /> Adaptive execution</span></CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={s.adaptiveExecution} onChange={(e) => set('adaptiveExecution', e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-gray-300" />
                <span className="text-sm text-gray-700">
                  Stop a prompt early once enough models mention you
                  <span className="block text-xs text-gray-400 mt-0.5">Runs providers one by one and stops a prompt as soon as the target is mentioned by the threshold below — cheaper and faster. <strong>Trade-off:</strong> fewer models run, so model-consensus and the Observation Engine see less data. Leave OFF for billed audits; use it for cheap re-checks.</span>
                </span>
              </label>
              {s.adaptiveExecution && (
                <div className="max-w-[220px]">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Stop after N models mention you</label>
                  <input type="number" min={1} max={4} value={s.adaptiveStopOnMentions}
                    onChange={(e) => set('adaptiveStopOnMentions', Math.max(1, Math.min(4, Number(e.target.value) || 2)))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Brand & contact */}
          <Card>
            <CardHeader>
              <CardTitle><span className="inline-flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /> Brand &amp; contact</span></CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Contact email (shown on the public site)</label>
                <input value={s.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} placeholder="Info@finded.com"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Founder first name (shown in the founder section)</label>
                <input value={s.founderName} onChange={(e) => set('founderName', e.target.value)} placeholder="Thijs"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
              {saved ? 'Saved' : 'Save settings'}
            </Button>
            {saved && <span className="text-sm text-emerald-600">Changes are live.</span>}
          </div>
        </div>
      )}
    </div>
  )
}
