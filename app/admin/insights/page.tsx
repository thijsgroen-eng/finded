'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui'
import { Loader2, TrendingUp, Lightbulb, RefreshCw, X, Database } from 'lucide-react'

interface Benchmark { n: number; avgVisibility: number | null; avgMentionFrequency: number | null; pctMentioned: number; factRates: Record<string, number> }
interface SegBenchmark extends Benchmark { key: string }
interface Pattern { key: string; lift: number; nWith: number; nWithout: number; evidence: string }
interface Opt { key: string; n: number }
interface Data {
  total: number
  filter: { cuisine: string; city: string; since: number; mentioned: string }
  filterN: number
  scopedN: number
  benchmark: Benchmark
  distribution: { label: string; n: number }[]
  perModel: { model: string; rate: number; n: number }[]
  patterns: Pattern[]
  patternScope: 'segment' | 'all'
  byCuisine: SegBenchmark[]
  byCity: SegBenchmark[]
  options: { cuisines: Opt[]; cities: Opt[] }
  facts: { key: string; label: string }[]
}

const pctv = (x: number | null) => x == null ? '—' : `${Math.round(x * 100)}%`
const scorev = (x: number | null) => x == null ? '—' : String(Math.round(x))
const ML: Record<string, string> = { openai: 'ChatGPT', anthropic: 'Claude', gemini: 'Gemini', perplexity: 'Perplexity' }

export default function InsightsPage() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [cuisine, setCuisine] = useState('')
  const [city, setCity] = useState('')
  const [since, setSince] = useState('0')
  const [mentioned, setMentioned] = useState('')
  const [note, setNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (cuisine) qs.set('cuisine', cuisine)
    if (city) qs.set('city', city)
    if (since !== '0') qs.set('since', since)
    if (mentioned) qs.set('mentioned', mentioned)
    const res = await fetch(`/api/admin/insights?${qs}`)
    setData(await res.json())
    setLoading(false)
  }, [cuisine, city, since, mentioned])

  useEffect(() => { load() }, [load])

  async function backfill() {
    setBusy(true); setNote(null)
    try {
      const res = await fetch('/api/admin/insights/backfill', { method: 'POST' })
      const j = await res.json()
      setNote(res.ok ? `Imported ${j.recorded} audit${j.recorded === 1 ? '' : 's'} into the knowledge base (${j.skipped} skipped, no score).` : (j.error ?? 'Backfill failed'))
      await load()
    } catch { setNote('Backfill failed') }
    setBusy(false)
  }

  const hasFilter = !!(cuisine || city || since !== '0' || mentioned)
  const b = data?.benchmark

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Industry insights</h1>
          <p className="text-sm text-gray-500 mt-1">Aggregate, anonymized intelligence from every audit — the data ChatGPT doesn&rsquo;t have.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}><RefreshCw className="w-3.5 h-3.5" /> Refresh</Button>
          <Button size="sm" onClick={backfill} disabled={busy}>{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Import existing audits</Button>
        </div>
      </div>

      {note && <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{note}</div>}

      {/* Filters */}
      <Card className="mb-5">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <Filter label="Cuisine" value={cuisine} onChange={setCuisine} options={data?.options.cuisines ?? []} />
            <Filter label="City" value={city} onChange={setCity} options={data?.options.cities ?? []} />
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Period</label>
              <select value={since} onChange={(e) => setSince(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white min-w-[140px]">
                <option value="0">All time</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last year</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Recommended</label>
              <select value={mentioned} onChange={(e) => setMentioned(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white min-w-[140px]">
                <option value="">All audits</option><option value="rec">Recommended by AI</option><option value="not">Not recommended</option>
              </select>
            </div>
            {hasFilter && (
              <button onClick={() => { setCuisine(''); setCity(''); setSince('0'); setMentioned('') }} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 mb-1.5">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            <div className="ml-auto text-xs text-gray-400 mb-1.5">{data ? `${data.scopedN} of ${data.total} audits` : ''}</div>
          </div>
        </CardContent>
      </Card>

      {loading || !data ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-10"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : data.total === 0 ? (
        <Card><CardContent className="pt-6 text-sm text-gray-500">
          No observations yet. Click <strong>Import existing audits</strong> above to backfill your completed audits into the knowledge base — after that, every new audit adds to it automatically.
        </CardContent></Card>
      ) : (
        <div className="space-y-5">
          {/* Stat cards for the current selection */}
          <Card>
            <CardHeader><CardTitle>{hasFilter ? `${[cuisine, city].filter(Boolean).join(' · ')}` : 'All restaurants'} <span className="text-gray-400 font-normal">· {data.filterN} audits</span></CardTitle></CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Stat label="Avg visibility" value={`${scorev(b!.avgVisibility)}/100`} />
                <Stat label="% recommended" value={pctv(b!.pctMentioned)} />
                <Stat label="Avg mention freq." value={pctv(b!.avgMentionFrequency)} />
                <Stat label="Audits" value={String(b!.n)} />
              </div>
            </CardContent>
          </Card>

          {/* Score distribution + per-model mention rates */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader><CardTitle>AI visibility distribution</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-2.5">
                {(() => { const max = Math.max(1, ...data.distribution.map((d) => d.n)); return data.distribution.map((d) => (
                  <div key={d.label} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-14 shrink-0 tabular-nums">{d.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden"><div className="h-full bg-gray-900 rounded-full" style={{ width: `${(d.n / max) * 100}%` }} /></div>
                    <span className="text-sm font-semibold text-gray-900 w-8 text-right tabular-nums">{d.n}</span>
                  </div>
                )) })()}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Mention rate by AI model</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-2.5">
                {data.perModel.map((m) => (
                  <div key={m.model} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-20 shrink-0">{ML[m.model] ?? m.model}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.round(m.rate * 100)}%` }} /></div>
                    <span className="text-sm font-semibold text-gray-900 w-10 text-right tabular-nums">{pctv(m.rate)}</span>
                  </div>
                ))}
                <p className="text-xs text-gray-400 pt-1">Share of {data.filterN} audits in which each model named the restaurant.</p>
              </CardContent>
            </Card>
          </div>

          {/* Signal presence bars */}
          <Card>
            <CardHeader><CardTitle>Signal presence {hasFilter ? 'in this selection' : 'overall'}</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-2.5">
              {data.facts.map((f) => (
                <div key={f.key} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-48 shrink-0">{f.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-gray-900 rounded-full" style={{ width: `${Math.round((b!.factRates[f.key] ?? 0) * 100)}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-10 text-right">{pctv(b!.factRates[f.key] ?? 0)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Patterns */}
          <Card>
            <CardHeader><CardTitle><span className="inline-flex items-center gap-2"><Lightbulb className="w-4 h-4 text-gray-400" /> Patterns we measured {data.patternScope === 'segment' ? '(this segment)' : '(across all restaurants)'}</span></CardTitle></CardHeader>
            <CardContent className="pt-0">
              {data.patterns.length === 0 ? (
                <p className="text-sm text-gray-400">Not enough data yet for reliable patterns (we need ≥5 audits on each side of a signal). Import more audits or wait as the dataset grows.</p>
              ) : (
                <ul className="space-y-2">
                  {data.patterns.map((p) => (
                    <li key={p.key} className="flex items-start gap-3 text-sm">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold shrink-0"><TrendingUp className="w-3.5 h-3.5" />{p.lift.toFixed(1)}×</span>
                      <span className="text-gray-700">{p.evidence}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Segment tables — click a row to filter */}
          {data.byCuisine.length > 0 && <Segments title="By cuisine" rows={data.byCuisine} active={cuisine} onPick={(k) => { setCuisine(k === cuisine ? '' : k); setCity('') }} />}
          {data.byCity.length > 0 && <Segments title="By city" rows={data.byCity} active={city} onPick={(k) => { setCity(k === city ? '' : k); setCuisine('') }} />}

          <p className="text-xs text-gray-400">Only aggregate statistics are shown — never individual restaurant data. Segments appear once at least 5 audits exist for them.</p>
        </div>
      )}

      <WarehousePanel />
    </div>
  )
}

// ── Observation Engine V2 (warehouse) — deterministic MV-backed analytics ──────
interface WarehouseData {
  ready: boolean; reason?: string
  providers?: { provider: string; model: string; version: string; month: string; responses: number; mention_rate: number; avg_position: number | null }[]
  citations?: { provider: string; domain: string; citation_type: string; citations: number; audits: number }[]
  correlations?: { signal: string; n_with: number; n_without: number; mention_lift: number | null; visibility_delta: number | null; direction: string; significant: boolean }[]
  cooccurrence?: { name_a: string; name_b: string; audits_together: number }[]
  competitors?: { normalized_name: string; audits: number; mentions: number }[]
  recommendationImpact?: { type: string; recommended: number; implemented: number; verified_n: number; avg_visibility_change: number | null }[]
}

function WarehousePanel() {
  const [w, setW] = useState<WarehouseData | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const loadW = useCallback(async () => {
    const r = await fetch('/api/admin/warehouse/insights'); setW(await r.json())
  }, [])
  useEffect(() => { loadW() }, [loadW])

  async function backfill() {
    setBusy('backfill'); setMsg(null)
    let offset = 0, total = 0
    try {
      for (;;) {
        const r = await fetch('/api/admin/warehouse/backfill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 200, offset }) })
        const j = await r.json(); if (!r.ok) throw new Error(j.error)
        total += j.written ?? 0; offset = j.nextOffset
        if (j.done) break
      }
      setMsg(`Backfilled ${total} audits into the warehouse.`)
      await refresh(); await loadW()
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Backfill failed') }
    setBusy(null)
  }
  async function refresh() {
    setBusy('refresh')
    try { await fetch('/api/admin/warehouse/refresh', { method: 'POST' }); await loadW() } finally { setBusy(null) }
  }
  async function recomputeImpact() {
    setBusy('impact'); setMsg(null)
    try {
      const r = await fetch('/api/admin/warehouse/impact', { method: 'POST' })
      const j = await r.json(); if (!r.ok) throw new Error(j.error)
      setMsg(`Recommendation impact updated for ${j.updated} of ${j.scanned} implemented recommendations.`)
      await loadW()
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Impact computation failed') }
    setBusy(null)
  }

  const pct = (x: number | null | undefined) => x == null ? '—' : `${Math.round(x * 100)}%`
  // Latest month per provider+version for the drift table.
  type PRow = NonNullable<WarehouseData['providers']>[number]
  const latest = (() => {
    const map = new Map<string, PRow>()
    for (const p of w?.providers ?? []) { const k = `${p.provider}|${p.version}`; const cur = map.get(k); if (!cur || p.month > cur.month) map.set(k, p) }
    return [...map.values()].sort((a, b) => a.provider.localeCompare(b.provider))
  })()

  return (
    <div className="mt-8 pt-6 border-t border-gray-100">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-lg font-bold text-gray-900 inline-flex items-center gap-2"><Database className="w-4.5 h-4.5 text-gray-400" /> Observation warehouse (V2)</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={recomputeImpact} disabled={busy !== null}>{busy === 'impact' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />} Recompute impact</Button>
          <Button variant="secondary" size="sm" onClick={refresh} disabled={busy !== null}>{busy === 'refresh' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Refresh views</Button>
          <Button size="sm" onClick={backfill} disabled={busy !== null}>{busy === 'backfill' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />} Backfill warehouse</Button>
        </div>
      </div>
      {msg && <div className="mb-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{msg}</div>}

      {!w ? <div className="text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin inline" /> Loading…</div>
      : !w.ready ? (
        <Card><CardContent className="pt-6 text-sm text-gray-500">{w.reason ?? 'Warehouse not ready.'} Apply migrations 029 + 030, then <strong>Backfill</strong>.</CardContent></Card>
      ) : (
        <div className="space-y-5">
          {/* Measured correlations (significant only) */}
          <Card>
            <CardHeader><CardTitle><span className="inline-flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gray-400" /> Measured correlations (statistically gated)</span></CardTitle></CardHeader>
            <CardContent className="pt-0">
              {(w.correlations ?? []).filter((c) => c.significant).length === 0 ? (
                <p className="text-sm text-gray-400">No correlation clears the significance + minimum-sample gate yet. They appear as the warehouse fills.</p>
              ) : (
                <ul className="space-y-2">
                  {(w.correlations ?? []).filter((c) => c.significant).map((c) => (
                    <li key={c.signal} className="flex items-center gap-3 text-sm">
                      <span className={`font-bold w-14 shrink-0 ${c.direction === 'positive' ? 'text-emerald-700' : 'text-red-600'}`}>{c.mention_lift!.toFixed(2)}×</span>
                      <span className="text-gray-700 flex-1">{c.signal.replace(/_/g, ' ')} {c.direction === 'positive' ? 'lifts' : 'lowers'} AI mentions</span>
                      <span className="text-xs text-gray-400">n={c.n_with}/{c.n_without}{c.visibility_delta != null ? ` · ${c.visibility_delta > 0 ? '+' : ''}${Math.round(c.visibility_delta)} vis` : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Provider drift */}
            <Card>
              <CardHeader><CardTitle>Provider mention rate (latest month, by version)</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-2">
                {latest.length === 0 ? <p className="text-sm text-gray-400">No provider data yet.</p> : latest.map((p) => (
                  <div key={`${p.provider}-${p.version}`} className="flex items-center gap-3 text-sm">
                    <span className="text-gray-700 w-40 shrink-0 truncate" title={`${p.provider} ${p.version}`}>{p.provider} <span className="text-gray-400">{p.version}</span></span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: pct(p.mention_rate) }} /></div>
                    <span className="font-semibold text-gray-900 w-10 text-right">{pct(p.mention_rate)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            {/* Citation influence */}
            <Card>
              <CardHeader><CardTitle>Top citation sources</CardTitle></CardHeader>
              <CardContent className="pt-0">
                {(w.citations ?? []).length === 0 ? <p className="text-sm text-gray-400">No citations captured yet.</p> : (
                  <div className="space-y-1.5">
                    {(w.citations ?? []).slice(0, 12).map((c, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="text-gray-700 flex-1 truncate">{c.domain} <span className="text-xs text-gray-400">({c.citation_type})</span></span>
                        <span className="text-xs text-gray-400">{c.provider}</span>
                        <span className="font-semibold text-gray-900 w-10 text-right tabular-nums">{c.citations}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Most-named competitors */}
            <Card>
              <CardHeader><CardTitle>Most-named competitors</CardTitle></CardHeader>
              <CardContent className="pt-0">
                {(w.competitors ?? []).length === 0 ? <p className="text-sm text-gray-400">No competitor data yet.</p> : (
                  <div className="space-y-1.5">
                    {(w.competitors ?? []).slice(0, 10).map((c) => (
                      <div key={c.normalized_name} className="flex items-center gap-3 text-sm">
                        <span className="text-gray-700 flex-1 truncate capitalize">{c.normalized_name}</span>
                        <span className="text-xs text-gray-400">{c.audits} audits</span>
                        <span className="font-semibold text-gray-900 w-10 text-right tabular-nums">{c.mentions}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Co-occurrence */}
            <Card>
              <CardHeader><CardTitle>Competitors that appear together</CardTitle></CardHeader>
              <CardContent className="pt-0">
                {(w.cooccurrence ?? []).length === 0 ? <p className="text-sm text-gray-400">No pairs reach the threshold yet (≥3 shared audits).</p> : (
                  <div className="space-y-1.5">
                    {(w.cooccurrence ?? []).slice(0, 10).map((p, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="text-gray-700 flex-1 truncate capitalize">{p.name_a} <span className="text-gray-300">+</span> {p.name_b}</span>
                        <span className="font-semibold text-gray-900 w-8 text-right tabular-nums">{p.audits_together}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recommendation impact */}
          {(w.recommendationImpact ?? []).length > 0 && (
            <Card>
              <CardHeader><CardTitle>Recommendation impact</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                      <th className="py-2 pr-4 font-medium">Type</th><th className="py-2 pr-4 font-medium">Recommended</th>
                      <th className="py-2 pr-4 font-medium">Implemented</th><th className="py-2 pr-4 font-medium">Verified</th>
                      <th className="py-2 pr-4 font-medium">Avg. visibility change</th>
                    </tr></thead>
                    <tbody>
                      {(w.recommendationImpact ?? []).map((r) => (
                        <tr key={r.type} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 pr-4 text-gray-800">{r.type}</td>
                          <td className="py-2 pr-4 text-gray-600">{r.recommended}</td>
                          <td className="py-2 pr-4 text-gray-600">{r.implemented}</td>
                          <td className="py-2 pr-4 text-gray-600">{r.verified_n}</td>
                          <td className="py-2 pr-4 font-medium text-gray-900">{r.avg_visibility_change == null ? '—' : `${r.avg_visibility_change > 0 ? '+' : ''}${Math.round(r.avg_visibility_change)}`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400 mt-2">Measured change appears once recommendations are marked implemented and a follow-up audit verifies them.</p>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-gray-400">Deterministic, version-aware analytics from the append-only warehouse. Correlations are only shown when statistically gated (min sample + meaningful lift).</p>
        </div>
      )}
    </div>
  )
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Opt[] }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 capitalize min-w-[160px]">
        <option value="">All</option>
        {options.map((o) => <option key={o.key} value={o.key}>{o.key} ({o.n})</option>)}
      </select>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}

function Segments({ title, rows, active, onPick }: { title: string; rows: SegBenchmark[]; active: string; onPick: (k: string) => void }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th className="py-2 pr-4 font-medium">Segment</th>
                <th className="py-2 pr-4 font-medium">Audits</th>
                <th className="py-2 pr-4 font-medium">Avg visibility</th>
                <th className="py-2 pr-4 font-medium">% recommended</th>
                <th className="py-2 pr-4 font-medium">% schema</th>
                <th className="py-2 pr-4 font-medium">% HTML menu</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} onClick={() => onPick(r.key)}
                  className={`border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 ${active === r.key ? 'bg-gray-50' : ''}`}>
                  <td className="py-2 pr-4 text-gray-800 capitalize font-medium">{r.key}</td>
                  <td className="py-2 pr-4 text-gray-500">{r.n}</td>
                  <td className="py-2 pr-4 text-gray-700">{scorev(r.avgVisibility)}/100</td>
                  <td className="py-2 pr-4 text-gray-700">{pctv(r.pctMentioned)}</td>
                  <td className="py-2 pr-4 text-gray-700">{pctv(r.factRates.restaurant_schema)}</td>
                  <td className="py-2 pr-4 text-gray-700">{pctv(r.factRates.html_menu)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
