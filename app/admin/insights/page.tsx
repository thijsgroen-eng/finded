'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { Loader2, TrendingUp, BarChart2, Lightbulb } from 'lucide-react'

interface Benchmark { n: number; avgVisibility: number | null; avgMentionFrequency: number | null; pctMentioned: number; factRates: Record<string, number> }
interface SegBenchmark extends Benchmark { key: string }
interface Pattern { key: string; withRate: number; withoutRate: number; lift: number; nWith: number; nWithout: number; evidence: string }
interface Data {
  total: number
  overall: Benchmark
  patterns: Pattern[]
  byCuisine: SegBenchmark[]
  byCity: SegBenchmark[]
  facts: { key: string; label: string }[]
}

const pct = (x: number | null) => x == null ? '—' : `${Math.round(x * 100)}%`
const score = (x: number | null) => x == null ? '—' : Math.round(x)

export default function InsightsPage() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/insights').then((r) => r.json()).then(setData).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Industry insights</h1>
        <p className="text-sm text-gray-500 mt-1">Aggregate, anonymized intelligence from every audit — the data ChatGPT doesn&rsquo;t have.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-10"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : !data || data.total === 0 ? (
        <Card><CardContent className="pt-6 text-sm text-gray-500">No observations yet. Insights appear automatically as audits complete — each one contributes anonymized facts to the knowledge base.</CardContent></Card>
      ) : (
        <div className="space-y-5">
          {/* Overall */}
          <Card>
            <CardHeader><CardTitle><span className="inline-flex items-center gap-2"><BarChart2 className="w-4 h-4 text-gray-400" /> Across all {data.total} audits</span></CardTitle></CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Stat label="Avg visibility" value={`${score(data.overall.avgVisibility)}/100`} />
                <Stat label="Avg mention freq." value={pct(data.overall.avgMentionFrequency)} />
                <Stat label="% recommended" value={pct(data.overall.pctMentioned)} />
                <Stat label="% with schema" value={pct(data.overall.factRates.restaurant_schema)} />
              </div>
            </CardContent>
          </Card>

          {/* Patterns */}
          <Card>
            <CardHeader><CardTitle><span className="inline-flex items-center gap-2"><Lightbulb className="w-4 h-4 text-gray-400" /> Patterns we measured</span></CardTitle></CardHeader>
            <CardContent className="pt-0">
              {data.patterns.length === 0 ? (
                <p className="text-sm text-gray-400">Not enough data yet to surface reliable patterns (we need ≥5 audits on each side of a signal before reporting it).</p>
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

          {/* Segment benchmarks */}
          {data.byCuisine.length > 0 && <Segments title="By cuisine" rows={data.byCuisine} />}
          {data.byCity.length > 0 && <Segments title="By city" rows={data.byCity} />}

          <p className="text-xs text-gray-400">Only aggregate statistics are shown — never individual restaurant data. Segments appear once at least 5 audits exist for them.</p>
        </div>
      )}
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

function Segments({ title, rows }: { title: string; rows: SegBenchmark[] }) {
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
                <tr key={r.key} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 pr-4 text-gray-800 capitalize">{r.key}</td>
                  <td className="py-2 pr-4 text-gray-500">{r.n}</td>
                  <td className="py-2 pr-4 text-gray-700">{score(r.avgVisibility)}/100</td>
                  <td className="py-2 pr-4 text-gray-700">{pct(r.pctMentioned)}</td>
                  <td className="py-2 pr-4 text-gray-700">{pct(r.factRates.restaurant_schema)}</td>
                  <td className="py-2 pr-4 text-gray-700">{pct(r.factRates.html_menu)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
