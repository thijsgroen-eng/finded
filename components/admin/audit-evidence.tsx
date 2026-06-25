'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

// Shapes mirror lib/engine/audit-evidence.ts + lib/engine/scoring.ts (serialized).
export interface RunAccounting {
  total_runs: number; completed: number; failed: number
  distinct_prompts: number; distinct_providers: number
  samples_per_prompt: number; expected_runs: number; any_grounded: boolean
  providers: { model: string; runs: number; completed: number; failed: number; model_version: string | null; grounded: boolean | null; avg_duration_ms: number | null }[]
}
export interface PromptEvidence {
  prompt_id: string; prompt_text: string | null; category: string | null; intent: string | null
  locale: string | null; mentioned_any: boolean
  models: { model: string; ran: number; failed: number; mentioned: boolean; mention_rate: number | null; best_position: number | null; model_version: string | null; grounded: boolean | null }[]
  top_competitors?: { name: string; count: number }[]
  sources?: string[]
}
export interface ScoreComponent { key: string; label: string; score: number; weight: number; detail: string }
export interface ScoreBreakdown {
  visibility_score: number; confidence_score: number
  components: ScoreComponent[]; method_version: string; formula: string
}

const MODEL_LABELS: Record<string, string> = {
  openai: 'ChatGPT', anthropic: 'Claude', gemini: 'Gemini', perplexity: 'Perplexity',
}
const label = (m: string) => MODEL_LABELS[m] ?? m

// ── Score breakdown ───────────────────────────────────────────────────────────
export function ScoreBreakdownCard({ breakdown }: { breakdown: ScoreBreakdown | null }) {
  return (
    <Card className="mb-5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>How this score is calculated</CardTitle>
          {breakdown && (
            <span className="text-xs text-gray-400">method {breakdown.method_version}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!breakdown ? (
          <p className="text-sm text-gray-400">
            Score breakdown was not recorded for this audit. Re-run the audit to capture the
            component-level explanation.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {breakdown.components.map((c) => (
                <div key={c.key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-800">{c.label}</span>
                    <span className="text-gray-500">
                      {Math.round(c.score)}/100 · weight {Math.round(c.weight * 100)}%
                    </span>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-gray-900 rounded-full" style={{ width: `${Math.min(100, c.score)}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{c.detail}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-3">
              <span className="font-medium text-gray-600">Formula. </span>{breakdown.formula}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── Run accounting (explains "N prompts / M model runs") ────────────────────────
export function RunAccountingCard({ acc, extractionConfidence }: { acc: RunAccounting; extractionConfidence: number | null }) {
  return (
    <Card className="mb-5">
      <CardHeader><CardTitle>Run accounting</CardTitle></CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-gray-600 mb-3">
          {acc.distinct_prompts} prompts × {acc.samples_per_prompt} sample{acc.samples_per_prompt === 1 ? '' : 's'} ×{' '}
          {acc.distinct_providers} model{acc.distinct_providers === 1 ? '' : 's'} ={' '}
          <strong>{acc.expected_runs}</strong> planned model calls.{' '}
          <strong>{acc.completed}</strong> completed
          {acc.failed > 0 && <>, <span className="text-red-600"><strong>{acc.failed}</strong> failed</span></>}
          {acc.total_runs !== acc.expected_runs && (
            <> ({acc.total_runs} recorded — the difference is failed/retried or providers added mid-run).</>
          )}
          {acc.total_runs === acc.expected_runs && '.'}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th className="py-2 pr-4 font-medium">Model</th>
                <th className="py-2 pr-4 font-medium">Calls</th>
                <th className="py-2 pr-4 font-medium">Completed</th>
                <th className="py-2 pr-4 font-medium">Failed</th>
                <th className="py-2 pr-4 font-medium">Grounded</th>
                <th className="py-2 pr-4 font-medium">Avg time</th>
                <th className="py-2 font-medium">Version</th>
              </tr>
            </thead>
            <tbody>
              {acc.providers.map((p) => (
                <tr key={p.model} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 pr-4 font-medium text-gray-800">{label(p.model)}</td>
                  <td className="py-2 pr-4 text-gray-600">{p.runs}</td>
                  <td className="py-2 pr-4 text-gray-600">{p.completed}</td>
                  <td className={`py-2 pr-4 ${p.failed > 0 ? 'text-red-600' : 'text-gray-400'}`}>{p.failed}</td>
                  <td className="py-2 pr-4 text-gray-600">{p.grounded == null ? '—' : p.grounded ? 'yes' : 'no'}</td>
                  <td className="py-2 pr-4 text-gray-600">{p.avg_duration_ms != null ? `${(p.avg_duration_ms / 1000).toFixed(1)}s` : '—'}</td>
                  <td className="py-2 text-gray-500 font-mono text-xs">{p.model_version ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Extraction confidence (entity parser):{' '}
          {extractionConfidence != null ? `${Math.round(extractionConfidence * 100)}%` : 'not recorded'}
          {acc.any_grounded ? ' · web-search grounding enabled on supported models' : ' · no web-search grounding'}
        </p>
      </CardContent>
    </Card>
  )
}

// ── Prompt-level evidence (collapsible) ─────────────────────────────────────────
export function PromptEvidenceCard({ prompts }: { prompts: PromptEvidence[] }) {
  const [open, setOpen] = useState(false)
  if (prompts.length === 0) return null
  const shown = open ? prompts : prompts.slice(0, 4)

  return (
    <Card className="mb-5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Prompt-level evidence</CardTitle>
          <span className="text-xs text-gray-400">{prompts.length} prompts · the questions diners ask AI</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {shown.map((p) => {
          const ranModels = p.models.filter((m) => m.ran > 0 && m.failed < m.ran)
          const mentionedModels = p.models.filter((m) => m.mentioned).map((m) => label(m.model))
          return (
            <div key={p.prompt_id} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{p.prompt_text ?? p.prompt_id}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {[p.category, p.intent, p.locale?.toUpperCase()].filter(Boolean).join(' · ')}
                    {ranModels.length > 0 ? ` · asked ${ranModels.map((m) => label(m.model)).join(', ')}` : ''}
                  </p>
                </div>
                {p.mentioned_any
                  ? <Badge variant="success">you appeared</Badge>
                  : <Badge variant="outline">not mentioned</Badge>}
              </div>

              <div className="text-sm space-y-1">
                <p className="text-gray-700">
                  <span className="text-gray-400">AI recommended: </span>
                  {p.top_competitors && p.top_competitors.length > 0
                    ? p.top_competitors.map((c) => c.name).join(', ')
                    : <span className="text-gray-400">no specific restaurants extracted</span>}
                </p>
                <p className="text-gray-700">
                  <span className="text-gray-400">Your restaurant: </span>
                  {p.mentioned_any
                    ? <span className="text-emerald-600 font-medium">mentioned{mentionedModels.length ? ` by ${mentionedModels.join(', ')}` : ''}</span>
                    : <span className="text-red-500 font-medium">not mentioned</span>}
                </p>
                {p.sources && p.sources.length > 0 && (
                  <p className="text-xs text-gray-400">Sources used: {p.sources.join(' · ')}</p>
                )}
              </div>
            </div>
          )
        })}
        {prompts.length > 4 && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-sm text-blue-500 hover:underline"
          >
            {open ? <><ChevronUp className="w-4 h-4" /> Show less</> : <><ChevronDown className="w-4 h-4" /> Show all {prompts.length} prompts</>}
          </button>
        )}
      </CardContent>
    </Card>
  )
}

// ── Website signals (typed checklist) ───────────────────────────────────────────
export interface WebsiteSignal {
  key: string; label: string; status: 'present' | 'weak' | 'missing'
  evidence?: string; recommendedFixType?: string
  why?: string; impact?: 'High' | 'Medium' | 'Low'; recommendation?: string
}

function SignalIcon({ status }: { status: WebsiteSignal['status'] }) {
  if (status === 'present') return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
  if (status === 'weak') return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
  return <XCircle className="w-4 h-4 text-gray-300 shrink-0" />
}

export function WebsiteSignalsPanel({ signals }: { signals: WebsiteSignal[] }) {
  if (signals.length === 0) {
    return (
      <Card className="mb-5">
        <CardHeader><CardTitle>Website signals</CardTitle></CardHeader>
        <CardContent className="pt-0"><p className="text-sm text-gray-400">No website audit was recorded for this audit.</p></CardContent>
      </Card>
    )
  }
  const present = signals.filter((s) => s.status === 'present').length
  return (
    <Card className="mb-5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Website signals</CardTitle>
          <span className="text-xs text-gray-400">{present}/{signals.length} present</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
          {signals.map((s) => (
            <div key={s.key} className="flex items-start gap-2 py-2 border-b border-gray-50">
              <SignalIcon status={s.status} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-800">{s.label}</span>
                  {s.status === 'weak' && <Badge variant="warning">weak</Badge>}
                  {s.status !== 'present' && s.impact && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{s.impact} impact</span>
                  )}
                </div>
                {s.evidence && <p className="text-xs text-gray-400 truncate" title={s.evidence}>{s.evidence}</p>}
                {s.status !== 'present' && (
                  <>
                    {s.why && <p className="text-xs text-gray-500 mt-0.5">{s.why}</p>}
                    {s.recommendation && <p className="text-xs text-gray-700 mt-0.5"><span className="text-gray-400">Do: </span>{s.recommendation}</p>}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Authority & citations (which third-party sources AI leans on) ───────────────
export interface AuthoritySignals {
  totalSources: number
  platforms: { key: string; label: string; count: number }[]
  otherDomains: { domain: string; count: number }[]
  ownCited: boolean
}

export function AuthorityPanel({ authority }: { authority: AuthoritySignals }) {
  if (authority.totalSources === 0) {
    return (
      <Card className="mb-5">
        <CardHeader><CardTitle>Sources AI relied on</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-gray-400">
            The AI models didn&rsquo;t return citation sources for this audit (grounding off or none provided),
            so there&rsquo;s nothing to show here.
          </p>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card className="mb-5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Sources AI relied on</CardTitle>
          <span className="text-xs text-gray-400">{authority.totalSources} sources AI cited</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-gray-600 mb-3">
          When the models answered, they leaned on these third-party sources. Being present and accurate on
          the ones they cite most makes you easier to recommend.
          {' '}
          {authority.ownCited
            ? <span className="text-emerald-600 font-medium">Your own site was among the cited sources.</span>
            : <span className="text-amber-600 font-medium">Your own site was not cited.</span>}
        </p>
        {authority.platforms.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {authority.platforms.map((p) => (
              <span key={p.key} className="inline-flex items-center gap-1.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1">
                {p.label} <span className="text-gray-400">×{p.count}</span>
              </span>
            ))}
          </div>
        )}
        {authority.otherDomains.length > 0 && (
          <p className="text-xs text-gray-400">
            Also cited: {authority.otherDomains.map((d) => `${d.domain} (${d.count})`).join(' · ')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ── Methodology & limitations ───────────────────────────────────────────────────
export function MethodologyCard({ acc, language }: { acc: RunAccounting; language: string }) {
  return (
    <Card className="mb-5">
      <CardHeader><CardTitle>Methodology &amp; limitations</CardTitle></CardHeader>
      <CardContent className="pt-0 text-sm text-gray-600 space-y-2 leading-relaxed">
        <p>
          We generate restaurant-discovery prompts (the questions diners actually ask) in{' '}
          {language === 'nl' ? 'Dutch' : 'English'}, then send each prompt to{' '}
          {acc.distinct_providers} AI model{acc.distinct_providers === 1 ? '' : 's'}{' '}
          {acc.samples_per_prompt} time{acc.samples_per_prompt === 1 ? '' : 's'} each
          {acc.any_grounded ? ', with web-search grounding where the model supports it' : ''}. Every
          answer is parsed independently to detect whether this restaurant (and its competitors) was
          named, and at what rank.
        </p>
        <p className="text-gray-500">
          Limitations: AI answers are non-deterministic, so figures are sampled estimates with a
          confidence band, not guarantees. Results reflect the moment of the run and the specific
          prompt set; failed model calls are excluded from rates. Competitor extraction depends on
          what the models named. Revenue figures, where shown, are illustrative and not measured.
        </p>
      </CardContent>
    </Card>
  )
}
