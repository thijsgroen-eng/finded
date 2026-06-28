'use client'

import { useState, useEffect, useCallback } from 'react'
import { Spinner, Button, Badge } from '@/components/ui'
import { Save, RotateCcw, Download, Check, Upload, Trash2, History, GitCompare, X } from 'lucide-react'

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
  published: Record<string, string[]>
  drafts: Record<string, string[]>
  hasDrafts: boolean
  version: number
}
type HistoryRow = { version: number; note: string | null; created_at: string }
type DiffRow = { category: string; historical: string[]; current: string[] }

export function PromptEditor() {
  const [businessType, setBusinessType] = useState('restaurant')
  const [language, setLanguage] = useState<Language>('nl')
  const [view, setView] = useState<View | null>(null)
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState<Record<string, string>>({})
  const [savingCat, setSavingCat] = useState<string | null>(null)
  const [savedCat, setSavedCat] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [busy, setBusy] = useState<'publish' | 'discard' | null>(null)
  const [history, setHistory] = useState<HistoryRow[] | null>(null)
  const [diff, setDiff] = useState<{ version: number; rows: DiffRow[] } | null>(null)

  // Editing baseline for a category: pending draft → published override → default.
  const baseline = useCallback((v: View, key: string) => {
    if (v.drafts[key]?.length) return v.drafts[key]
    if (v.published[key]?.length) return v.published[key]
    return v.defaults[key] ?? []
  }, [])

  const applyView = useCallback((v: View) => {
    setView(v)
    const next: Record<string, string> = {}
    for (const { key } of CATEGORY_META) next[key] = baseline(v, key).join('\n')
    setText(next)
  }, [baseline])

  const load = useCallback(async () => {
    setLoading(true)
    setHistory(null); setDiff(null)
    const res = await fetch(`/api/admin/prompts?business_type=${businessType}&language=${language}`)
    applyView(await res.json())
    setLoading(false)
  }, [businessType, language, applyView])

  useEffect(() => { load() }, [load])

  async function saveDraft(key: string) {
    setSavingCat(key)
    const templates = text[key].split('\n').map((l) => l.trim()).filter(Boolean)
    const res = await fetch('/api/admin/prompts', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_type: businessType, language, category: key, templates }),
    })
    if (res.ok) { applyView(await res.json()); setSavedCat(key); setTimeout(() => setSavedCat((c) => (c === key ? null : c)), 2000) }
    setSavingCat(null)
  }

  async function clearDraft(key: string) {
    setSavingCat(key)
    const res = await fetch('/api/admin/prompts', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_type: businessType, language, category: key, templates: [] }),
    })
    if (res.ok) applyView(await res.json())
    setSavingCat(null)
  }

  async function post(action: string, extra: Record<string, unknown> = {}) {
    const res = await fetch('/api/admin/prompts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_type: businessType, language, action, ...extra }),
    })
    return res
  }

  async function importAll() { setImporting(true); const r = await post('import_defaults'); if (r.ok) applyView(await r.json()); setImporting(false) }
  async function publish() { setBusy('publish'); const r = await post('publish'); if (r.ok) applyView(await r.json()); setBusy(null); if (history) loadHistory() }
  async function discard() { setBusy('discard'); const r = await post('discard'); if (r.ok) applyView(await r.json()); setBusy(null) }

  async function loadHistory() {
    const res = await fetch(`/api/admin/prompts?business_type=${businessType}&language=${language}&history=1`)
    const j = await res.json(); setHistory(j.history ?? [])
  }
  async function showDiff(version: number) {
    const res = await fetch(`/api/admin/prompts?business_type=${businessType}&language=${language}&diff=${version}`)
    if (res.ok) { const j = await res.json(); setDiff({ version, rows: j.diff ?? [] }) }
  }
  async function rollback(version: number) {
    if (!confirm(`Roll the live prompts back to v${version}? The current set is snapshotted first, so this is reversible.`)) return
    const r = await post('rollback', { version }); if (r.ok) { applyView(await r.json()); loadHistory() }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-500 font-medium">Business type</span>
          <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900">
            {BUSINESS_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-500 font-medium">Language</span>
          <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900">
            {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </label>
        {view && <span className="text-xs text-gray-400 pb-2">Live version: <span className="font-semibold text-gray-700">v{view.version}</span></span>}
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={() => (history ? setHistory(null) : loadHistory())}>
            <History className="w-4 h-4" /> History
          </Button>
          <Button variant="secondary" onClick={importAll} disabled={importing}>
            {importing ? <Spinner className="w-4 h-4" /> : <Download className="w-4 h-4" />} Import defaults
          </Button>
        </div>
      </div>

      {/* Publish bar — only when there are pending drafts */}
      {view?.hasDrafts && (
        <div className="flex flex-wrap items-center gap-2 mb-5 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <span className="font-medium text-amber-800">You have unpublished draft changes. Audits still use the live (published) set until you publish.</span>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={discard} disabled={busy !== null}>
              {busy === 'discard' ? <Spinner className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />} Discard drafts
            </Button>
            <Button onClick={publish} disabled={busy !== null}>
              {busy === 'publish' ? <Spinner className="w-4 h-4 text-white" /> : <Upload className="w-4 h-4" />} Publish
            </Button>
          </div>
        </div>
      )}

      {/* History panel */}
      {history && (
        <div className="mb-5 bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 inline-flex items-center gap-2"><History className="w-4 h-4 text-gray-400" /> Version history</h3>
            <button onClick={() => { setHistory(null); setDiff(null) }} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400">No published versions yet. Publish a change to create the first.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {history.map((h) => (
                <li key={h.version} className="flex items-center gap-3 py-2 text-sm">
                  <span className="font-semibold text-gray-700 w-12">v{h.version}</span>
                  <span className="flex-1 text-gray-600 truncate">{h.note ?? '—'}</span>
                  <span className="text-xs text-gray-400 tabular-nums">{new Date(h.created_at).toLocaleDateString()}</span>
                  <Button variant="ghost" onClick={() => showDiff(h.version)}><GitCompare className="w-3.5 h-3.5" /> Diff</Button>
                  <Button variant="ghost" onClick={() => rollback(h.version)}><RotateCcw className="w-3.5 h-3.5" /> Restore</Button>
                </li>
              ))}
            </ul>
          )}
          {diff && (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="text-sm font-medium text-gray-700 mb-2">v{diff.version} (historical) vs current (live)</p>
              <div className="space-y-3">
                {diff.rows.filter((r) => r.historical.join('\n') !== r.current.join('\n')).map((r) => (
                  <div key={r.category} className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-gray-500 mb-1">{r.category} — v{diff.version}</p>
                      <pre className="whitespace-pre-wrap bg-red-50 border border-red-100 rounded p-2 text-gray-700">{r.historical.join('\n') || '(default)'}</pre>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-500 mb-1">{r.category} — current</p>
                      <pre className="whitespace-pre-wrap bg-emerald-50 border border-emerald-100 rounded p-2 text-gray-700">{r.current.join('\n') || '(default)'}</pre>
                    </div>
                  </div>
                ))}
                {diff.rows.every((r) => r.historical.join('\n') === r.current.join('\n')) && (
                  <p className="text-sm text-gray-400">No differences — this version matches the current live set.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-sm text-gray-500 mb-6 leading-relaxed">
        One prompt per line. Placeholders <code className="px-1 bg-gray-100 rounded">{'{location}'}</code>,{' '}
        <code className="px-1 bg-gray-100 rounded">{'{subtype}'}</code> and{' '}
        <code className="px-1 bg-gray-100 rounded">{'{businessType}'}</code> are filled at audit time.
        Edits are saved as <em>drafts</em> and only affect audits once you <em>Publish</em>.
      </p>

      {loading || !view ? (
        <div className="flex items-center gap-2 text-gray-400 py-12 justify-center"><Spinner /> Loading templates…</div>
      ) : (
        <div className="space-y-5">
          {CATEGORY_META.map(({ key, label, hint }) => {
            const hasDraft = (view.drafts[key]?.length ?? 0) > 0
            const overridden = (view.published[key]?.length ?? 0) > 0
            const dirty = text[key] !== baseline(view, key).join('\n')
            return (
              <div key={key} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{label}</h3>
                    {hasDraft ? <Badge variant="warning">Draft</Badge>
                      : overridden ? <Badge variant="info">Custom</Badge>
                      : <Badge variant="outline">Default</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    {hasDraft && (
                      <Button variant="ghost" onClick={() => clearDraft(key)} disabled={savingCat === key}>
                        <RotateCcw className="w-3.5 h-3.5" /> Clear draft
                      </Button>
                    )}
                    <Button onClick={() => saveDraft(key)} disabled={savingCat === key || !dirty}>
                      {savingCat === key ? <Spinner className="w-4 h-4" /> : savedCat === key ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                      Save draft
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-2">{hint}</p>
                <textarea
                  value={text[key] ?? ''}
                  onChange={(e) => setText((d) => ({ ...d, [key]: e.target.value }))}
                  rows={Math.max(4, (text[key]?.split('\n').length ?? 0) + 1)}
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
