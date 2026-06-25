import { supabaseAdmin } from '@/lib/supabase/client'
import { computeMetrics } from '@/lib/engine/metrics'
import {
  buildRunAccounting, buildPromptEvidence, averageExtractionConfidence,
} from '@/lib/engine/audit-evidence'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { formatDateTime, statusVariant } from '@/lib/utils'
import { notFound } from 'next/navigation'
import { ExternalLink, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Recommendations } from '@/components/admin/recommendations'
import { OutreachEmail } from '@/components/admin/outreach-email'
import { ScoreTrend } from '@/components/admin/score-trend'
import { CopyReportLink } from '@/components/admin/copy-report-link'
import { AuditControls } from '@/components/admin/audit-controls'
import { ReportSender } from '@/components/admin/report-sender'
import {
  ScoreBreakdownCard, RunAccountingCard, PromptEvidenceCard, MethodologyCard, WebsiteSignalsPanel, AuthorityPanel,
  CompetitorComparisonCard,
} from '@/components/admin/audit-evidence'
import { toWebsiteSignals, gapSignals } from '@/lib/audit/website-signals'
import { buildAuthoritySignals } from '@/lib/audit/authority'
import { buildVisibilitySummary } from '@/lib/audit/summary'
import { buildDataQuality } from '@/lib/audit/data-quality'
import { buildKeyFindings, buildCompetitorObservations } from '@/lib/audit/findings'
import { buildCompetitorComparison } from '@/lib/audit/competitor-comparison'
import { languageForCountry } from '@/lib/i18n'

async function getAuditData(id: string) {
  const { data: audit } = await supabaseAdmin
    .from('audits')
    .select('*, restaurant:restaurants(id, name, city, cuisine, business_type, website, domain, preview_slug, country)')
    .eq('id', id)
    .single()

  if (!audit) return null

  const entity = audit.restaurant as {
    id: string
    name: string
    city: string
    cuisine: string | null
    business_type: string | null
    website: string | null
    domain: string | null
    preview_slug: string | null
    country: string | null
  }

  const [
    { data: websiteAudit },
    { data: mentions },
    { data: modelRuns },
    { data: promptRuns },
    { data: entities },
    { data: visibilityScore },
    { data: competitors },
    { data: signalGaps },
  ] = await Promise.all([
    supabaseAdmin.from('website_audits').select('*').eq('audit_id', id).single(),
    supabaseAdmin.from('mentions').select('model, prompt_id, mentioned, mention_frequency, position, sentiment, sample_index').eq('audit_id', id),
    supabaseAdmin.from('model_runs').select('model, prompt_id, sample_index, grounded, model_version, locale, duration_ms, raw_response, status, sources').eq('audit_id', id),
    supabaseAdmin.from('prompt_runs').select('prompt_id, category, intent, prompt_text').eq('audit_id', id),
    supabaseAdmin.from('entities').select('prompt_id, model, name, confidence, is_target, normalized_name').eq('audit_id', id),
    supabaseAdmin.from('visibility_scores').select('*').eq('audit_id', id).single(),
    supabaseAdmin.from('competitors').select('*').eq('audit_id', id).order('mention_count', { ascending: false }).limit(6),
    supabaseAdmin.from('signal_gaps').select('*').eq('restaurant_id', entity.id).order('severity'),
  ])

  // The email from the public request that produced this audit (for prefill).
  const { data: req } = await supabaseAdmin
    .from('audit_requests').select('email').eq('audit_id', id).maybeSingle()

  // Crawled competitor sites for the comparison ("why they win").
  const { data: competitorAudits } = await supabaseAdmin
    .from('competitor_audits').select('competitor_name, website, signals').eq('audit_id', id)

  const metrics = computeMetrics(mentions ?? [])
  const runAccounting = buildRunAccounting(modelRuns ?? [])
  const promptEvidence = buildPromptEvidence(promptRuns ?? [], mentions ?? [], modelRuns ?? [], entities ?? [])
  const extractionConfidence = averageExtractionConfidence(entities ?? [])
  const allSources = (modelRuns ?? []).flatMap((r: { sources?: unknown }) => Array.isArray(r.sources) ? r.sources : [])
  const authority = buildAuthoritySignals(allSources, entity.domain)
  return {
    audit, entity, websiteAudit, metrics, modelRuns: modelRuns ?? [], visibilityScore,
    competitors: competitors ?? [], signalGaps: signalGaps ?? [],
    runAccounting, promptEvidence, extractionConfidence, authority, requestEmail: req?.email ?? null,
    competitorAudits: competitorAudits ?? [],
  }
}

const MODEL_LABELS: Record<string, string> = {
  openai:     'ChatGPT',
  anthropic:  'Claude',
  gemini:     'Gemini',
  perplexity: 'Perplexity',
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  critical: { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
  high:     { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  medium:   { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400' },
  low:      { bg: 'bg-gray-50',   text: 'text-gray-600',   dot: 'bg-gray-400' },
}

export default async function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getAuditData(id)
  if (!data) notFound()

  const { audit, entity, websiteAudit, metrics, visibilityScore, competitors, signalGaps,
          runAccounting, promptEvidence, extractionConfidence, authority, competitorAudits } = data

  const visScore       = visibilityScore?.visibility_score ?? null
  const scoreBreakdown = visibilityScore?.score_breakdown ?? null
  const auditLanguage  = languageForCountry(entity.country)
  const myMentions     = metrics.total_mentions
  const topComp        = competitors[0]?.mention_count ?? 0

  const businessType = entity.business_type ?? 'business'
  const specialty    = entity.cuisine ?? null

  // Website signals (with cuisine/location-clarity context) + the "why" synthesis.
  const websiteSignals = toWebsiteSignals(websiteAudit, { cuisine: entity.cuisine, city: entity.city })
  const mentioned = myMentions > 0
  const presentSignalLabels = websiteSignals.filter((s) => s.status === 'present').map((s) => s.label)
  const gapSignalLabels = gapSignals(websiteSignals).map((s) => s.label)
  const competitorList = competitors.map((c: { name: string; mention_count: number }) => ({ name: c.name, mention_count: c.mention_count ?? 0 }))
  const dataQuality = buildDataQuality({ total_runs: runAccounting.total_runs, completed: runAccounting.completed, providers: runAccounting.providers })
  const keyFindings = buildKeyFindings({ mentioned, ownCited: authority.ownCited, presentSignals: presentSignalLabels, gapSignals: gapSignalLabels })
  const observations = buildCompetitorObservations({ mentioned, ownCited: authority.ownCited, authorityPlatforms: authority.platforms.map((p) => p.label), topCompetitors: competitorList, gapSignals: gapSignalLabels })
  // Competitor visibility comparison — grade the same AI-readable signals for you vs each crawled competitor.
  const competitorComparison = buildCompetitorComparison(
    websiteAudit ?? {},
    competitorAudits.map((ca: { competitor_name: string; website: string | null; signals: any }) => ({
      name: ca.competitor_name, website: ca.website, signals: ca.signals,
    })),
  )
  const visibilitySummary = buildVisibilitySummary({
    restaurantName: entity.name,
    totalMentions: myMentions,
    sampleCount: runAccounting.completed,
    mentionFrequencyPct: metrics.mention_frequency * 100,
    modelConsensus: metrics.model_consensus,
    providersRan: runAccounting.distinct_providers,
    topCompetitors: competitors.map((c: { name: string; mention_count: number }) => ({ name: c.name, mention_count: c.mention_count ?? 0 })),
    websiteGaps: gapSignals(websiteSignals).map((s) => s.label),
    authorityPlatforms: authority.platforms.map((p) => p.label),
    ownCited: authority.ownCited,
  })

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">

      {/* Back + header */}
      <div className="mb-6">
        <Link href="/admin/audits" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          All audits
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{entity.name}</h1>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full capitalize">{businessType}</span>
            </div>
            <p className="text-sm text-gray-500">
              {entity.city}
              {specialty ? ` · ${specialty}` : ''}
              {' · Audited '}
              {formatDateTime(audit.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {entity.website && (
              <a href={entity.website.startsWith('http') ? entity.website : `https://${entity.website}`}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-md px-2.5 py-1.5">
                <ExternalLink className="w-3 h-3" />
                Website
              </a>
            )}
            {entity.preview_slug && audit.status === 'completed' && (
              <CopyReportLink slug={entity.preview_slug} />
            )}
            <Badge variant={statusVariant(audit.status) as any}>{audit.status}</Badge>
            <AuditControls auditId={id} status={audit.status} />
          </div>
        </div>
      </div>

      {/* ── 1. AI visibility status — lead with the finding, not the score ── */}
      <Card className="mb-5">
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">AI visibility status</p>
              <p className={`text-2xl font-bold ${mentioned ? 'text-emerald-600' : 'text-red-600'}`}>
                {mentioned ? 'Recommended for some searches' : 'Not recommended'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Your restaurant appeared in <strong>{myMentions}</strong> of <strong>{runAccounting.completed}</strong> successful AI responses tested.
              </p>
              {topComp > myMentions && competitorList.length > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  AI frequently recommended competitors instead — {competitorList.slice(0, 3).map((c) => c.name).join(', ')}.
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <span
                title={dataQuality.reason}
                className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                  dataQuality.level === 'High' ? 'bg-emerald-50 text-emerald-700'
                  : dataQuality.level === 'Medium' ? 'bg-amber-50 text-amber-700'
                  : 'bg-red-50 text-red-600'
                }`}>
                Data quality: {dataQuality.level}
              </span>
              <p className="text-xs text-gray-400 mt-2">
                Visibility score {visScore != null ? Math.round(visScore) : '—'}/100
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">{dataQuality.reason}</p>
        </CardContent>
      </Card>

      {/* ── 2. Why this result — plain-language synthesis ── */}
      <Card className="mb-5 border-gray-200">
        <CardHeader><CardTitle>Why this result</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-gray-700 leading-relaxed">{visibilitySummary}</p>
        </CardContent>
      </Card>

      {/* ── 3. Key findings ── */}
      <Card className="mb-5">
        <CardHeader><CardTitle>Key findings</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
            {keyFindings.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className={`font-bold ${f.ok ? 'text-emerald-500' : 'text-red-400'}`}>{f.ok ? '✓' : '✕'}</span>
                <span className="text-sm text-gray-700">{f.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 4. Why competitors may be winning ── */}
      {observations.length > 0 && (
        <Card className="mb-5">
          <CardHeader><CardTitle>Why competitors may be winning</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {observations.map((o, i) => (
                <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-gray-300">•</span><span>{o}</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── 5. Prompt-level evidence (the story) ── */}
      <PromptEvidenceCard prompts={promptEvidence} />

      {/* Signal gaps — root causes */}
      {signalGaps.length > 0 && (
        <Card className="mb-5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Signal gaps</CardTitle>
              <span className="text-xs text-gray-400">Why AI models may not recommend this {businessType}</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {signalGaps.map((gap: any) => {
              const style = SEVERITY_STYLES[gap.severity] ?? SEVERITY_STYLES.low
              return (
                <div key={gap.id} className={`${style.bg} rounded-lg p-4`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full ${style.dot} mt-1.5 shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-sm font-semibold ${style.text}`}>{gap.title}</p>
                        <span className={`text-xs font-medium uppercase ${style.text} opacity-60`}>{gap.severity}</span>
                      </div>
                      <p className="text-xs text-gray-600">{gap.evidence}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Competitor comparison */}
      {competitors.length > 0 && (
        <Card className="mb-5">
          <CardHeader><CardTitle>Restaurants AI recommends instead</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                <div className="w-40 shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{entity.name}</p>
                  <p className="text-xs text-blue-500">You</p>
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-gray-900 rounded-full"
                    style={{ width: `${Math.min(100, (myMentions / Math.max(topComp, myMentions, 1)) * 100)}%` }} />
                </div>
                <span className="text-sm font-semibold text-gray-900 w-20 text-right">{myMentions} mentions</span>
              </div>
              {competitors.map((comp: any) => {
                const pct = Math.min(100, (comp.mention_count / Math.max(topComp, myMentions, 1)) * 100)
                const ahead = comp.mention_count > myMentions
                return (
                  <div key={comp.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-40 shrink-0">
                      <p className="text-sm text-gray-700 truncate">{comp.name}</p>
                      {Array.isArray(comp.providers) && comp.providers.length > 0 && (
                        <p className="text-xs text-gray-400 truncate"
                           title={Array.isArray(comp.sample_evidence) && comp.sample_evidence.length ? comp.sample_evidence.join('\n\n') : undefined}>
                          {comp.providers.map((m: string) => MODEL_LABELS[m] ?? m).join(', ')}
                          {Array.isArray(comp.prompt_ids) && comp.prompt_ids.length > 0 && ` · ${comp.prompt_ids.length} prompt${comp.prompt_ids.length === 1 ? '' : 's'}`}
                        </p>
                      )}
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden mt-1.5">
                      <div className={`h-full rounded-full ${ahead ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm text-gray-600 w-20 text-right mt-0.5">{comp.mention_count} mentions</span>
                    <span className={`text-xs w-12 text-right font-medium mt-1 ${ahead ? 'text-red-500' : 'text-emerald-500'}`}>
                      {ahead ? `+${comp.mention_count - myMentions}` : `-${myMentions - comp.mention_count}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Why competitors may be winning — signal-by-signal comparison of crawled competitor sites */}
      <CompetitorComparisonCard comparison={competitorComparison} />

      {/* Model breakdown + sentiment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card>
          <CardHeader><CardTitle>AI model breakdown</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {metrics.model_breakdown.map((mb: any) => (
                <div key={mb.model} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 w-24 shrink-0">{MODEL_LABELS[mb.model] ?? mb.model}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-gray-900 rounded-full" style={{ width: `${Math.round(mb.frequency * 100)}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-10 text-right">{Math.round(mb.frequency * 100)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Sentiment</CardTitle></CardHeader>
          <CardContent className="pt-0">
            {metrics.total_mentions === 0 ? (
              <p className="text-sm text-gray-400 py-4">No mentions to analyse</p>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Positive', key: 'positive', color: 'bg-emerald-500' },
                  { label: 'Neutral',  key: 'neutral',  color: 'bg-gray-400' },
                  { label: 'Negative', key: 'negative', color: 'bg-red-400' },
                ].map(({ label, key, color }) => {
                  const count = metrics.sentiment_breakdown[key as keyof typeof metrics.sentiment_breakdown]
                  const pct   = metrics.total_mentions > 0 ? (count / metrics.total_mentions) * 100 : 0
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 w-16">{label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm text-gray-600 w-16 text-right">{count} <span className="text-xs text-gray-400">({Math.round(pct)}%)</span></span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Website signals — typed checklist */}
      <WebsiteSignalsPanel signals={websiteSignals} />

      {/* Authority & citations — which third-party sources AI leaned on */}
      <AuthorityPanel authority={authority} />

      {/* ── Prioritized recommendations ── */}
      <Recommendations auditId={id} />

      {/* ── Technical findings (the score math, kept but de-emphasised) ── */}
      <div className="mt-2 mb-3">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Technical findings</h2>
      </div>
      <ScoreBreakdownCard breakdown={scoreBreakdown} />
      <RunAccountingCard acc={runAccounting} extractionConfidence={extractionConfidence} />
      <MethodologyCard acc={runAccounting} language={auditLanguage} />
      <ScoreTrend restaurantId={entity.id} />

      {/* Outreach email (NL/EN) */}
      <OutreachEmail auditId={id} restaurantName={entity.name} defaultLanguage={languageForCountry(entity.country)} />

      {/* Reports — download or email the three plan PDFs */}
      <ReportSender auditId={id} defaultEmail={data.requestEmail} />

      {audit.error_message && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 mt-4">
          <strong>Error:</strong> {audit.error_message}
        </div>
      )}
    </div>
  )
}
