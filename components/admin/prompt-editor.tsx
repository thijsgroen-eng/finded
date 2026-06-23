'use client'

import { useState, useEffect, useCallback } from 'react'
import { Spinner, Button, Badge } from '@/components/ui'
import { Save, RotateCcw, Download, Check } from 'lucide-react'

type Language = 'nl' | 'en'

const CATEGORY_META: Array<{ key: string; label: string; hint: string }> = [
  { key: 'category',        label: 'Cuisine / category', hint: 'Cuisine-specific — the winnable core (importance 95).' },
  { key: 'occasions',       label: 'Occasions',          hint: 'Date night, family, business dinner (82).' },
  { key: 'discovery',       label: 'Discovery',          hint: 'Generic "best restaurants" — benchmark only (76).' },
  { key: 'geographic',      label: 'Geographic',         hint: 'Neighbourhood / near-me queries (74).' },
  { key: 'problemSolution', label: 'Problem / solution', hint: 'Specific needs: kids, tourists, late-night (72).' },
  { key: 'trust',           label: 'Trust',              hint: 'Most reviewed, highest rated, hidden gems (70).' },
]

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'default',    label: 'Generic (other types)' },
]
const LANGUAGES: Array<{ value: Language; label: string }> = [
  { value: 'nl', label: 'Nederlands' },
  { value: 'en', label: 'English' },
]

type View = {
  business_type: string
  language: Language
  defaults: Record<string, string[]>
  overrides: Record<string, string[]>
}

export function PromptEditor() {
  const [businessType, setBusinessType] = useState('restaurant')
  const [language, setLanguage] = useState<Language>('nl')
  const [view, setView] = useState<View | null>(null)
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingCat, setSavingCat] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [savedCat, setSavedCat] = useState<string | null>(null)

  // Effective lines for a category: override if present, else code default.
  const effective = useCallback(
    (v: View, key: string) =>
      v.overrides[key]?.length ? v.overrides[key] : (v.defaults[key] ?? []),
    [],
  )

  const applyView = useCallback(
    (v: View) => {
      setView(v)
      const next: Record<string, string> = {}
      for (const { key } of CATEGORY_META) next[key] = effective(v, key).join('\n')
      setDrafts(next)
    },
    [effective],
  )

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/prompts?business_type=${businessType}&language=${language}`)
    const v: View = await res.json()
    applyView(v)
    setLoading(false)
  }, [businessType, language, applyView])

  useEffect(() => { load() }, [load])

  async function save(key: string) {
    setSavingCat(key)
    const templates = drafts[key].split('\n').map((l) => l.trim()).filter(Boolean)
    const res = await fetch('/api/admin/prompts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_type: businessType, language, category: key, templates }),
    })
    if (res.ok) {
      applyView(await res.json())
      setSavedCat(key)
      setTimeout(() => setSavedCat((c) => (c === key ? null : c)), 2000)
    }
    setSavingCat(null)
  }

  async function resetToDefault(key: string) {
    setSavingCat(key)
    const res = await fetch('/api/admin/prompts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_type: businessType, language, category: key, templates: [] }),
    })
    if (res.ok) applyView(await res.json())
    setSavingCat(null)
  }

  async function importAll() {
    setImporting(true)
    const res = await fetch('/api/admin/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_type: businessType, language, action: 'import_defaults' }),
    })
    if (res.ok) applyView(await res.json())
    setImporting(false)
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-500 font-medium">Business type</span>
          <select
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900"
          >
            {BUSINESS_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-500 font-medium">Language</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900"
          >
            {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </label>
        <div className="ml-auto">
          <Button variant="secondary" onClick={importAll} disabled={importing}>
            {importing ? <Spinner className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            Import defaults into editor
          </Button>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-6 leading-relaxed">
        One prompt per line. Placeholders <code className="px-1 bg-gray-100 rounded">{'{location}'}</code>,{' '}
        <code className="px-1 bg-gray-100 rounded">{'{subtype}'}</code> and{' '}
        <code className="px-1 bg-gray-100 rounded">{'{businessType}'}</code> are filled at audit time.
        Saving a section overrides the built-in templates; <em>Reset</em> removes the override so the
        shipped defaults apply again.
      </p>

      {loading || !view ? (
        <div className="flex items-center gap-2 text-gray-400 py-12 justify-center">
          <Spinner /> Loading templates…
        </div>
      ) : (
        <div className="space-y-5">
          {CATEGORY_META.map(({ key, label, hint }) => {
            const overridden = (view.overrides[key]?.length ?? 0) > 0
            const dirty = drafts[key] !== effective(view, key).join('\n')
            return (
              <div key={key} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{label}</h3>
                    {overridden
                      ? <Badge variant="info">Custom</Badge>
                      : <Badge variant="outline">Default</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    {overridden && (
                      <Button
                        variant="ghost"
                        onClick={() => resetToDefault(key)}
                        disabled={savingCat === key}
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset
                      </Button>
                    )}
                    <Button onClick={() => save(key)} disabled={savingCat === key || !dirty}>
                      {savingCat === key
                        ? <Spinner className="w-4 h-4" />
                        : savedCat === key
                          ? <Check className="w-4 h-4" />
                          : <Save className="w-4 h-4" />}
                      Save
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-2">{hint}</p>
                <textarea
                  value={drafts[key] ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                  rows={Math.max(4, (drafts[key]?.split('\n').length ?? 0) + 1)}
                  spellCheck={false}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 font-mono text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
