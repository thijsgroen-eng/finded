'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui'
import { Loader2, TrendingUp, Lightbulb, RefreshCw, X } from 'lucide-react'

interface Benchmark { n: number; avgVisibility: number | null; avgMentionFrequency: number | null; pctMentioned: number; factRates: Record<string, number> }
interface SegBenchmark extends Benchmark { key: string }
interface Pattern { key: string; lift: number; nWith: number; nWithout: number; evidence: string }
interface Opt { key: string; n: number }
interface Data {
  total: number
  filter: { cuisine: string; city: string }
  filterN: number
  benchmark: Benchmark
  patterns: Pattern[]
  patternScope: 'segment' | 'all'
  byCuisine: SegBenchmark[]
  byCity: SegBenchmark[]
  options: { cuisines: Opt[]; cities: Opt[] }
  facts: { key: string; label: string }[]
}

const pctv = (x: number | null) => x == null ? '—' : `${Math.round(x * 100)}%`
const scorev = (x: number | null) => x == null ? '—' : String(Math.round(x))

export default function InsightsPage() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [cuisine, setCuisine] = useState('')
  const [city, setCity] = useState('')
  const [note, setNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (cuisine) qs.set('cuisine', cuisine)
    if (city) qs.set('city', city)
    const res = await fetch(`/api/admin/insights?${qs}`)
    setData(await res.json())
    setLoading(false)
  }, [cuisine, city])

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

  const hasFilter = !!(cuisine || city)
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
            {hasFilter && (
              <button onClick={() => { setCuisine(''); setCity('') }} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 mb-1.5">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            <div className="ml-auto text-xs text-gray-400 mb-1.5">{data ? `${data.total} audits in knowledge base` : ''}</div>
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

          {/* Signal presence bars */}
          <Card>
            <CardHeader><CardTitle>Signal presence {hasFilter ? 'in this segment' : 'overall'}</CardTitle></CardHeader>
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
