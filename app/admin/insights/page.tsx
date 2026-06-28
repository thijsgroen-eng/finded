'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui'
import {
  Loader2, TrendingUp, TrendingDown, RefreshCw, Database, Sparkles, Server,
  Quote, BarChart3, GitCompare, FlaskConical, Building2, Zap, CheckCircle2, Minus,
} from 'lucide-react'

// ── Types (mirror /api/admin/warehouse/overview) ─────────────────────────────
type Direction = 'positive' | 'negative' | 'neutral'
interface Discovery {
  id: string; category: 'correlation' | 'provider' | 'impact' | 'benchmark' | 'citation'
  headline: string; detail: string; metric: string; confidence: number | null
  sampleSize: number; direction: Direction
}
interface ProviderSeries {
  provider: string; version: string; model: string; latest_month: string | null
  latest_rate: number | null; latest_position: number | null; responses_total: number
  months: number; drift: number; trend_slope: number; drift_confidence: number
  series: { month: string; mention_rate: number; responses: number }[]
}
interface Segment {
  segment_type: string; segment_key: string; n: number; avg_vis: number | null
  median_vis: number | null; p90: number | null; p25: number | null
  pct_mentioned: number | null; deviation: number | null
}
interface Correlation {
  signal: string; n_with: number; n_without: number; mention_with: number; mention_without: number
  mention_lift: number | null; visibility_delta: number | null; confidence: number
  direction: Direction; significant: boolean
}
interface Overview {
  ready: boolean; reason?: string
  counts: { audits: number | null; responses: number | null; citations: number | null; entities: number | null; recommendations: number | null }
  freshness: { latest_audit: string | null; latest_response: string | null; first_month: string | null; last_month: string | null }
  discoveries: Discovery[]
  providers: ProviderSeries[]
  benchmarks: { overall: { n: number; avg_vis: number | null; median_vis: number | null; p90: number | null; p25: number | null; pct_mentioned: number | null } | null; segments: Segment[] }
  citations: { top: { provider: string; domain: string; citation_type: string; citations: number; audits: number }[]; trends: { domain: string; total: number; series: { month: string; citations: number }[] }[] }
  correlations: Correlation[]
  research: { index: { month: string; n: number; avg_visibility: number | null; pct_mentioned: number | null }[]; index_slope: number; index_stddev: number; segments: { segment_type: string; segment_key: string; month: string; n: number; avg_visibility: number | null; pct_mentioned: number | null }[] }
  competitors: { normalized_name: string; audits: number; mentions: number }[]
  cooccurrence: { name_a: string; name_b: string; audits_together: number }[]
  recommendationImpact: { type: string; recommended: number; implemented: number; verified_n: number; avg_visibility_change: number | null }[]
  warehouse: { versions: string[]; provider_count: number; gates: Record<string, number> }
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: Sparkles },
  { id: 'discoveries', label: 'Discoveries', icon: Zap },
  { id: 'providers', label: 'Providers', icon: Server },
  { id: 'citations', label: 'Citations', icon: Quote },
  { id: 'benchmarks', label: 'Benchmarks', icon: BarChart3 },
  { id: 'correlations', label: 'Correlations', icon: GitCompare },
  { id: 'research', label: 'Research', icon: FlaskConical },
  { id: 'warehouse', label: 'Warehouse', icon: Database },
] as const
type TabId = typeof TABS[number]['id']

const ML: Record<string, string> = { openai: 'ChatGPT', anthropic: 'Claude', gemini: 'Gemini', perplexity: 'Perplexity' }
const pct = (x: number | null | undefined) => x == null ? '—' : `${Math.round(x * 100)}%`
const score = (x: number | null | undefined) => x == null ? '—' : String(Math.round(x))
const num = (x: number | null | undefined) => x == null ? '—' : x.toLocaleString()
const confLabel = (c: number | null) => c == null ? 'measured' : c >= 0.99 ? '99%+ confident' : `${Math.round(c * 100)}% confident`
const monthShort = (m: string | null) => m == null ? '—' : new Date(m + 'T00:00:00').toLocaleDateString('en', { month: 'short', year: '2-digit' })
const catMeta: Record<Discovery['category'], { label: string; icon: typeof Zap }> = {
  correlation: { label: 'Correlation', icon: GitCompare },
  provider: { label: 'Provider drift', icon: Server },
  impact: { label: 'Verified impact', icon: CheckCircle2 },
  benchmark: { label: 'Benchmark', icon: BarChart3 },
  citation: { label: 'Citation', icon: Quote },
}

export default function InsightsPage() {
  const [tab, setTab] = useState<TabId>('overview')
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await fetch('/api/admin/warehouse/overview'); setData(await r.json()) }
    catch { setData(null) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

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
      await refresh(); setMsg(`Backfilled ${total} audits into the warehouse.`); await load()
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Backfill failed') }
    setBusy(null)
  }
  async function refresh() {
    setBusy('refresh')
    try { await fetch('/api/admin/warehouse/refresh', { method: 'POST' }); await load() } finally { setBusy(null) }
  }
  async function recomputeImpact() {
    setBusy('impact'); setMsg(null)
    try {
      const r = await fetch('/api/admin/warehouse/impact', { method: 'POST' })
      const j = await r.json(); if (!r.ok) throw new Error(j.error)
      setMsg(`Recommendation impact updated for ${j.updated} of ${j.scanned} implemented recommendations.`); await load()
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Impact computation failed') }
    setBusy(null)
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Intelligence hub</h1>
          <p className="text-sm text-gray-500 mt-1">Deterministic, reproducible findings from the Observation Warehouse — the data ChatGPT doesn&rsquo;t have. No estimates, no LLMs.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={recomputeImpact} disabled={busy !== null}>{busy === 'impact' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />} Recompute impact</Button>
          <Button variant="secondary" size="sm" onClick={refresh} disabled={busy !== null}>{busy === 'refresh' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Refresh</Button>
          <Button size="sm" onClick={backfill} disabled={busy !== null}>{busy === 'backfill' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />} Backfill</Button>
        </div>
      </div>
      {msg && <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{msg}</div>}

      {/* Tab nav */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 mb-6 -mx-1 px-1">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${active ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-16"><Loader2 className="w-4 h-4 animate-spin" /> Loading the warehouse…</div>
      ) : !data?.ready ? (
        <NotReady reason={data?.reason} onBackfill={backfill} busy={busy === 'backfill'} />
      ) : (
        <>
          {tab === 'overview' && <OverviewTab d={data} onJump={setTab} />}
          {tab === 'discoveries' && <DiscoveriesTab d={data} />}
          {tab === 'providers' && <ProvidersTab d={data} />}
          {tab === 'citations' && <CitationsTab d={data} />}
          {tab === 'benchmarks' && <BenchmarksTab d={data} />}
          {tab === 'correlations' && <CorrelationsTab d={data} />}
          {tab === 'research' && <ResearchTab d={data} />}
          {tab === 'warehouse' && <WarehouseTab d={data} />}
        </>
      )}
    </div>
  )
}

// ── Shared building blocks ───────────────────────────────────────────────────
function NotReady({ reason, onBackfill, busy }: { reason?: string; onBackfill: () => void; busy: boolean }) {
  return (
    <Card><CardContent className="pt-8 pb-8 text-center">
      <Database className="w-8 h-8 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-gray-600 max-w-md mx-auto">{reason ?? 'The warehouse has no data yet.'} Apply migrations 029–034, then backfill your completed audits to populate the intelligence hub.</p>
      <div className="mt-4"><Button size="sm" onClick={onBackfill} disabled={busy}>{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />} Backfill the warehouse</Button></div>
    </CardContent></Card>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  )
}

function DirChip({ direction, metric }: { direction: Direction; metric: string }) {
  const cls = direction === 'positive' ? 'text-emerald-700 bg-emerald-50' : direction === 'negative' ? 'text-red-700 bg-red-50' : 'text-gray-700 bg-gray-100'
  const Icon = direction === 'positive' ? TrendingUp : direction === 'negative' ? TrendingDown : Minus
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-sm tabular-nums ${cls}`}><Icon className="w-3.5 h-3.5" />{metric}</span>
}

function Sparkline({ values, color = 'bg-gray-900' }: { values: number[]; color?: string }) {
  if (values.length === 0) return null
  const max = Math.max(1e-9, ...values)
  return (
    <div className="flex items-end gap-0.5 h-8">
      {values.map((v, i) => (
        <div key={i} className={`w-1.5 rounded-sm ${color}`} style={{ height: `${Math.max(6, (v / max) * 100)}%` }} />
      ))}
    </div>
  )
}

function DiscoveryCard({ x }: { x: Discovery }) {
  const meta = catMeta[x.category]
  const Icon = meta.icon
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <DirChip direction={x.direction} metric={x.metric} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 first-letter:uppercase">{x.headline}</p>
            <p className="text-sm text-gray-500 mt-0.5">{x.detail}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline"><Icon className="w-3 h-3 mr-1" />{meta.label}</Badge>
              <Badge variant={x.confidence != null && x.confidence >= 0.95 ? 'success' : 'default'}>{confLabel(x.confidence)}</Badge>
              <span className="text-xs text-gray-400">n={x.sampleSize.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
function OverviewTab({ d, onJump }: { d: Overview; onJump: (t: TabId) => void }) {
  const top = d.discoveries.slice(0, 4)
  const idx = d.research.index
  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Stat label="Audits in warehouse" value={num(d.counts.audits)} />
            <Stat label="Provider responses" value={num(d.counts.responses)} />
            <Stat label="Citations captured" value={num(d.counts.citations)} />
            <Stat label="Entities observed" value={num(d.counts.entities)} />
            <Stat label="Recommendations" value={num(d.counts.recommendations)} />
          </div>
          <p className="text-xs text-gray-400 mt-4">Data {monthShort(d.freshness.first_month)} → {monthShort(d.freshness.last_month)} · {d.warehouse.provider_count} provider version{d.warehouse.provider_count === 1 ? '' : 's'} tracked.</p>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-900 inline-flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-500" /> Top discoveries</h2>
          <button onClick={() => onJump('discoveries')} className="text-xs text-gray-500 hover:text-gray-900">View all ({d.discoveries.length}) →</button>
        </div>
        {top.length === 0 ? (
          <Card><CardContent className="pt-5 text-sm text-gray-500">No statistically significant findings yet. As the warehouse fills, gated discoveries will appear here automatically.</CardContent></Card>
        ) : <div className="space-y-3">{top.map((x) => <DiscoveryCard key={x.id} x={x} />)}</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader><CardTitle>AI visibility index</CardTitle></CardHeader>
          <CardContent className="pt-0">
            {idx.length === 0 ? <p className="text-sm text-gray-400">No monthly data yet.</p> : (
              <>
                <div className="flex items-end gap-1 h-24">
                  {(() => { const max = Math.max(1, ...idx.map((r) => r.avg_visibility ?? 0)); return idx.map((r) => (
                    <div key={r.month} className="flex-1 flex flex-col items-center gap-1" title={`${monthShort(r.month)}: ${score(r.avg_visibility)}/100 (n=${r.n})`}>
                      <div className="w-full bg-gray-900 rounded-t" style={{ height: `${((r.avg_visibility ?? 0) / max) * 100}%` }} />
                    </div>
                  )) })()}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                  <span>{monthShort(idx[0]?.month)}</span>
                  <span className={d.research.index_slope >= 0 ? 'text-emerald-600' : 'text-red-600'}>{d.research.index_slope >= 0 ? '↑' : '↓'} {d.research.index_slope >= 0 ? '+' : ''}{d.research.index_slope.toFixed(1)}/mo</span>
                  <span>{monthShort(idx[idx.length - 1]?.month)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Provider mention rate (latest)</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-2.5">
            {d.providers.length === 0 ? <p className="text-sm text-gray-400">No provider data yet.</p> : d.providers.map((p) => (
              <div key={`${p.provider}-${p.version}`} className="flex items-center gap-3 text-sm">
                <span className="text-gray-700 w-28 shrink-0 truncate">{ML[p.provider] ?? p.provider}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: pct(p.latest_rate) }} /></div>
                <span className="font-semibold text-gray-900 w-10 text-right tabular-nums">{pct(p.latest_rate)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DiscoveriesTab({ d }: { d: Overview }) {
  if (d.discoveries.length === 0) return <Card><CardContent className="pt-6 text-sm text-gray-500">No discoveries clear the significance + minimum-sample gate yet. They appear automatically as the warehouse grows — nothing here is estimated.</CardContent></Card>
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">Every discovery is statistically gated (min sample {d.warehouse.gates.MIN_N}, ≥{Math.round((d.warehouse.gates.MIN_LIFT - 1) * 100)}% effect, ≥{Math.round(d.warehouse.gates.CONF_GATE * 100)}% confidence where applicable) and reproducible from the warehouse.</p>
      {d.discoveries.map((x) => <DiscoveryCard key={x.id} x={x} />)}
    </div>
  )
}

function ProvidersTab({ d }: { d: Overview }) {
  if (d.providers.length === 0) return <Card><CardContent className="pt-6 text-sm text-gray-500">No provider data captured yet.</CardContent></Card>
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">Mention rate by provider <strong>version</strong> — so a model upgrade that changes restaurant recommendations is visible, not averaged away.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {d.providers.map((p) => (
          <Card key={`${p.provider}-${p.version}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>{ML[p.provider] ?? p.provider} <span className="text-gray-400 font-normal text-sm">{p.version}</span></span>
                {p.months >= 2 && <Badge variant={Math.abs(p.drift) < 0.02 ? 'default' : p.drift > 0 ? 'success' : 'danger'}>{p.drift > 0 ? '+' : ''}{Math.round(p.drift * 100)}pts</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-end justify-between gap-3 mb-3">
                <div><div className="text-2xl font-bold text-gray-900 tabular-nums">{pct(p.latest_rate)}</div><div className="text-xs text-gray-400">latest mention rate · {monthShort(p.latest_month)}</div></div>
                <Sparkline values={p.series.map((s) => s.mention_rate)} color="bg-emerald-500" />
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{p.responses_total.toLocaleString()} responses</span>
                <span>{p.months} month{p.months === 1 ? '' : 's'}</span>
                {p.latest_position != null && <span>avg pos {p.latest_position.toFixed(1)}</span>}
                {p.months >= 2 && <span className="ml-auto">{Math.round(p.drift_confidence * 100)}% conf.</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function CitationsTab({ d }: { d: Overview }) {
  const { top, trends } = d.citations
  if (top.length === 0) return <Card><CardContent className="pt-6 text-sm text-gray-500">No citations captured yet. Citations are recorded for providers that return sources (e.g. Perplexity).</CardContent></Card>
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card>
        <CardHeader><CardTitle>Most-cited sources</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1.5">
            {top.slice(0, 15).map((c, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-gray-700 flex-1 truncate">{c.domain} <span className="text-xs text-gray-400">({c.citation_type})</span></span>
                <span className="text-xs text-gray-400">{ML[c.provider] ?? c.provider}</span>
                <span className="font-semibold text-gray-900 w-12 text-right tabular-nums">{c.citations}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Citation trend over time</CardTitle></CardHeader>
        <CardContent className="pt-0">
          {trends.length === 0 ? <p className="text-sm text-gray-400">Not enough history yet.</p> : (
            <div className="space-y-3">
              {trends.slice(0, 8).map((t) => (
                <div key={t.domain} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-40 shrink-0 truncate" title={t.domain}>{t.domain}</span>
                  <div className="flex-1"><Sparkline values={t.series.map((s) => s.citations)} color="bg-gray-900" /></div>
                  <span className="text-sm font-semibold text-gray-900 w-10 text-right tabular-nums">{t.total}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function BenchmarksTab({ d }: { d: Overview }) {
  const o = d.benchmarks.overall
  const cuisines = d.benchmarks.segments.filter((s) => s.segment_type === 'cuisine').slice(0, 15)
  const cities = d.benchmarks.segments.filter((s) => s.segment_type === 'city').slice(0, 15)
  return (
    <div className="space-y-5">
      {o && (
        <Card>
          <CardHeader><CardTitle>Overall (all restaurants)</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <Stat label="Audits" value={num(o.n)} />
              <Stat label="Avg visibility" value={`${score(o.avg_vis)}/100`} />
              <Stat label="Median" value={`${score(o.median_vis)}/100`} />
              <Stat label="P90" value={`${score(o.p90)}/100`} />
              <Stat label="% recommended" value={pct(o.pct_mentioned)} />
            </div>
          </CardContent>
        </Card>
      )}
      {cuisines.length > 0 && <SegTable title="By cuisine" rows={cuisines} overall={o?.avg_vis ?? null} />}
      {cities.length > 0 && <SegTable title="By city" rows={cities} overall={o?.avg_vis ?? null} />}
      <p className="text-xs text-gray-400">Percentiles and segment averages are computed in-warehouse from aggregate audits only — never individual restaurant data.</p>
    </div>
  )
}

function SegTable({ title, rows, overall }: { title: string; rows: Segment[]; overall: number | null }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 text-left text-xs text-gray-400">
              <th className="py-2 pr-4 font-medium">Segment</th><th className="py-2 pr-4 font-medium">Audits</th>
              <th className="py-2 pr-4 font-medium">Avg vis</th><th className="py-2 pr-4 font-medium">vs avg</th>
              <th className="py-2 pr-4 font-medium">% recommended</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.segment_key} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 pr-4 text-gray-800 capitalize font-medium">{r.segment_key}</td>
                  <td className="py-2 pr-4 text-gray-500 tabular-nums">{r.n}</td>
                  <td className="py-2 pr-4 text-gray-700 tabular-nums">{score(r.avg_vis)}/100</td>
                  <td className={`py-2 pr-4 font-medium tabular-nums ${r.deviation == null ? 'text-gray-400' : r.deviation > 0 ? 'text-emerald-700' : 'text-red-600'}`}>{r.deviation == null ? '—' : `${r.deviation > 0 ? '+' : ''}${Math.round(r.deviation)}`}</td>
                  <td className="py-2 pr-4 text-gray-700 tabular-nums">{pct(r.pct_mentioned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {overall != null && <p className="text-xs text-gray-400 mt-2">&ldquo;vs avg&rdquo; compares each segment to the overall average of {score(overall)}/100.</p>}
      </CardContent>
    </Card>
  )
}

function CorrelationsTab({ d }: { d: Overview }) {
  const sig = d.correlations.filter((c) => c.significant)
  const other = d.correlations.filter((c) => !c.significant)
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle><span className="inline-flex items-center gap-2"><GitCompare className="w-4 h-4 text-gray-400" /> Significant signal correlations</span></CardTitle></CardHeader>
        <CardContent className="pt-0">
          {sig.length === 0 ? <p className="text-sm text-gray-400">No correlation clears the significance gate yet ({d.warehouse.gates.MIN_N}+ on each side, ≥{Math.round(d.warehouse.gates.CONF_GATE * 100)}% confidence).</p> : (
            <ul className="space-y-2.5">
              {sig.map((c) => (
                <li key={c.signal} className="flex items-center gap-3 text-sm">
                  <DirChip direction={c.direction} metric={`${c.mention_lift!.toFixed(2)}×`} />
                  <span className="text-gray-700 flex-1 capitalize">{c.signal.replace(/_/g, ' ')} {c.direction === 'positive' ? 'lifts' : 'lowers'} AI mentions</span>
                  <Badge variant={c.confidence >= 0.95 ? 'success' : 'default'}>{Math.round(c.confidence * 100)}%</Badge>
                  <span className="text-xs text-gray-400 w-24 text-right">n={c.n_with}/{c.n_without}{c.visibility_delta != null ? ` · ${c.visibility_delta > 0 ? '+' : ''}${Math.round(c.visibility_delta)} vis` : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      {other.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Below the significance gate</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-gray-400 mb-2">Shown for transparency — not yet reportable (insufficient sample, small effect, or low confidence).</p>
            <ul className="space-y-1.5">
              {other.map((c) => (
                <li key={c.signal} className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="w-14 shrink-0 tabular-nums">{c.mention_lift == null ? '—' : `${c.mention_lift.toFixed(2)}×`}</span>
                  <span className="flex-1 capitalize">{c.signal.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-gray-400">{Math.round(c.confidence * 100)}% · n={c.n_with}/{c.n_without}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ResearchTab({ d }: { d: Overview }) {
  const idx = d.research.index
  // Segment trajectories (top cuisines by latest visibility).
  const byKey = new Map<string, { month: string; avg: number }[]>()
  for (const s of d.research.segments.filter((x) => x.segment_type === 'cuisine')) {
    if (!byKey.has(s.segment_key)) byKey.set(s.segment_key, [])
    byKey.get(s.segment_key)!.push({ month: s.month, avg: s.avg_visibility ?? 0 })
  }
  const trajectories = [...byKey.entries()].map(([key, rows]) => {
    rows.sort((a, b) => a.month.localeCompare(b.month))
    return { key, latest: rows[rows.length - 1]?.avg ?? 0, slope: slopeOf(rows.map((r) => r.avg)), series: rows }
  }).filter((t) => t.series.length >= 2).sort((a, b) => b.latest - a.latest).slice(0, 10)

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle>Finded AI Visibility Index</CardTitle></CardHeader>
        <CardContent className="pt-0">
          {idx.length === 0 ? <p className="text-sm text-gray-400">No monthly history yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                  <th className="py-2 pr-4 font-medium">Month</th><th className="py-2 pr-4 font-medium">Audits</th>
                  <th className="py-2 pr-4 font-medium">Avg visibility</th><th className="py-2 pr-4 font-medium">% recommended</th>
                </tr></thead>
                <tbody>
                  {idx.map((r) => (
                    <tr key={r.month} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-4 text-gray-800">{monthShort(r.month)}</td>
                      <td className="py-2 pr-4 text-gray-500 tabular-nums">{r.n}</td>
                      <td className="py-2 pr-4 text-gray-700 tabular-nums">{score(r.avg_visibility)}/100</td>
                      <td className="py-2 pr-4 text-gray-700 tabular-nums">{pct(r.pct_mentioned)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">Trend {d.research.index_slope >= 0 ? '+' : ''}{d.research.index_slope.toFixed(2)} points/month (σ {d.research.index_stddev.toFixed(1)}). Versioned, anonymized — the basis for future published reports.</p>
        </CardContent>
      </Card>
      {trajectories.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Cuisine trajectories</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-3">
            {trajectories.map((t) => (
              <div key={t.key} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 w-32 shrink-0 truncate capitalize">{t.key}</span>
                <div className="flex-1"><Sparkline values={t.series.map((s) => s.avg)} color="bg-gray-900" /></div>
                <span className="text-sm font-semibold text-gray-900 w-12 text-right tabular-nums">{score(t.latest)}</span>
                <span className={`text-xs w-12 text-right ${t.slope >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{t.slope >= 0 ? '+' : ''}{t.slope.toFixed(1)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function WarehouseTab({ d }: { d: Overview }) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle>Warehouse health</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
            <Stat label="fact_audit" value={num(d.counts.audits)} />
            <Stat label="fact_provider_response" value={num(d.counts.responses)} />
            <Stat label="fact_citation" value={num(d.counts.citations)} />
            <Stat label="fact_entity" value={num(d.counts.entities)} />
            <Stat label="fact_recommendation" value={num(d.counts.recommendations)} />
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <div>Latest audit observed: <span className="text-gray-800">{d.freshness.latest_audit ? new Date(d.freshness.latest_audit).toLocaleString() : '—'}</span></div>
            <div>Coverage: <span className="text-gray-800">{monthShort(d.freshness.first_month)} → {monthShort(d.freshness.last_month)}</span></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Provider versions tracked</CardTitle></CardHeader>
        <CardContent className="pt-0">
          {d.warehouse.versions.length === 0 ? <p className="text-sm text-gray-400">None yet.</p> : (
            <div className="flex flex-wrap gap-2">{d.warehouse.versions.map((v) => <Badge key={v} variant="outline">{v}</Badge>)}</div>
          )}
        </CardContent>
      </Card>

      {d.recommendationImpact.length > 0 && (
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
                  {d.recommendationImpact.map((r) => (
                    <tr key={r.type} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-4 text-gray-800">{r.type}</td>
                      <td className="py-2 pr-4 text-gray-600 tabular-nums">{r.recommended}</td>
                      <td className="py-2 pr-4 text-gray-600 tabular-nums">{r.implemented}</td>
                      <td className="py-2 pr-4 text-gray-600 tabular-nums">{r.verified_n}</td>
                      <td className="py-2 pr-4 font-medium text-gray-900 tabular-nums">{r.avg_visibility_change == null ? '—' : `${r.avg_visibility_change > 0 ? '+' : ''}${Math.round(r.avg_visibility_change)}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader><CardTitle><span className="inline-flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" /> Most-named competitors</span></CardTitle></CardHeader>
          <CardContent className="pt-0">
            {d.competitors.length === 0 ? <p className="text-sm text-gray-400">No competitor data yet.</p> : (
              <div className="space-y-1.5">
                {d.competitors.slice(0, 10).map((c) => (
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
        <Card>
          <CardHeader><CardTitle>Competitors that appear together</CardTitle></CardHeader>
          <CardContent className="pt-0">
            {d.cooccurrence.length === 0 ? <p className="text-sm text-gray-400">No pairs reach the threshold yet (≥3 shared audits).</p> : (
              <div className="space-y-1.5">
                {d.cooccurrence.slice(0, 10).map((p, i) => (
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

      <p className="text-xs text-gray-400">Append-only, version-stamped, deterministic. Every figure on this page is reproducible from these tables — no LLM ever computes an analytic.</p>
    </div>
  )
}

// Tiny local least-squares slope for cuisine trajectories (mirrors lib/warehouse/stats).
function slopeOf(ys: number[]): number {
  const n = ys.length
  if (n < 2) return 0
  const mx = (n - 1) / 2, my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) { num += (i - mx) * (ys[i] - my); den += (i - mx) ** 2 }
  return den === 0 ? 0 : num / den
}
