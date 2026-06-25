'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui'
import { Loader2, Check, Globe, User } from 'lucide-react'

interface Settings {
  defaultLanguage: 'nl' | 'en'
  forceLanguage: boolean
  contactEmail: string
  founderName: string
}

export default function SettingsPage() {
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
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Defaults applied across reports, audits and the public site.</p>
      </div>

      {loading || !s ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-10"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
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
