import { supabaseAdmin } from '@/lib/supabase/client'
import { computeMetrics } from '@/lib/engine/metrics'
import { Card, CardHeader, CardTitle, CardContent, Badge, StatCard } from '@/components/ui'
import { formatDateTime, formatPercent, statusVariant } from '@/lib/utils'
import { ESTIMATE_CAVEAT } from '@/lib/estimates'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, TrendingUp, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Recommendations } from '@/components/admin/recommendations'
import { ScoreTrend } from '@/components/admin/score-trend'
import { CopyReportLink } from '@/components/admin/copy-report-link'

async function getAuditData(id: string) {
  const { data: audit } = await supabaseAdmin
    .from('audits')
    .select('*, restaurant:restaurants(id, name, city, cuisine, business_type, website, preview_slug)')
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
    preview_slug: string | null
  }

  const [
    { data: websiteAudit },
    { data: mentions },
    { data: modelRuns },
    { data: visibilityScore },
    { data: competitors },
    { data: signalGaps },
  ] = await Promise.all([
    supabaseAdmin.from('website_audits').select('*').eq('audit_id', id).single(),
    supabaseAdmin.from('mentions').select('model, prompt_id, mentioned, mention_frequency, position, sentiment').eq('audit_id', id),
    supabaseAdmin.from('model_runs').select('model, duration_ms, tokens_used').eq('audit_id', id),
    supabaseAdmin.from('visibility_scores').select('*').eq('audit_id', id).single(),
    supabaseAdmin.from('competitors').select('*').eq('audit_id', id).order('mention_count', { ascending: false }).limit(6),
    supabaseAdmin.from('signal_gaps').select('*').eq('restaurant_id', entity.id).order('severity'),
  ])

  const metrics = computeMetrics(mentions ?? [])
  return { audit, entity, websiteAudit, metrics, modelRuns: modelRuns ?? [], visibilityScore, competitors: competitors ?? [], signalGaps: signalGaps ?? [] }
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

function CheckRow({ label, value }: { label: string; value: boolean | null }) {
  if (value === null) return null
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      {value
        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        : <XCircle className="w-4 h-4 text-gray-300" />}
    </div>
  )
}

export default async function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getAuditData(id)
  if (!data) notFound()

  const { audit, entity, websiteAudit, metrics, visibilityScore, competitors, signalGaps } = data

  const totalPrompts   = audit.total_prompts ?? metrics.total_prompts
  const totalModelRuns = audit.total_model_runs ?? data.modelRuns.length
  const visScore       = visibilityScore?.visibility_score ?? null
  const oppScore       = visibilityScore?.opportunity_score ?? null
  const oppLabel       = visibilityScore?.opportunity_label ?? null
  const revenueMin     = visibilityScore?.estimated_revenue_min ?? null
  const revenueMax     = visibilityScore?.estimated_revenue_max ?? null
  const visitorsMin    = visibilityScore?.estimated_visitors_min ?? null
  const visitorsMax    = visibilityScore?.estimated_visitors_max ?? null
  const myMentions     = metrics.total_mentions
  const topComp        = competitors[0]?.mention_count ?? 0

  const oppColor = oppScore !== null
    ? oppScore >= 75 ? 'text-red-600' : oppScore >= 50 ? 'text-amber-600' : oppScore >= 25 ? 'text-blue-600' : 'text-gray-500'
    : 'text-gray-400'

  const businessType = entity.business_type ?? 'business'
  const specialty    = entity.cuisine ?? null

  return (
    <div className="p-8 max-w-5xl mx-auto">

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
          </div>
        </div>
      </div>

      {/* Score trend */}
      <ScoreTrend restaurantId={entity.id} />

      {/* Core metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Mention frequency" value={formatPercent(metrics.mention_frequency)} sub={`${myMentions} of ${totalPrompts} prompts`} />
        <StatCard label="Position score"    value={`${Math.round(metrics.position_score)}/100`} sub={metrics.position_score >= 60 ? 'Good' : metrics.position_score >= 30 ? 'Fair' : 'Poor'} />
        <StatCard label="Model consensus"   value={`${metrics.model_consensus}/4`} sub="models that mentioned" />
        <StatCard label="Prompts run"       value={totalPrompts} sub={`${totalModelRuns} model runs`} />
      </div>

      {/* Opportunity + Revenue */}
      {oppScore !== null && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <Card className="border-amber-100 bg-amber-50/30">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">AI opportunity score</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-bold ${oppColor}`}>{Math.round(oppScore)}</span>
                    <span className="text-gray-400 text-lg">/100</span>
                  </div>
                  {oppLabel && (
                    <span className={`text-xs font-medium mt-1 inline-block ${oppColor}`}>
                      {oppLabel.replace('_', ' ')} opportunity
                    </span>
                  )}
                </div>
                <TrendingUp className="w-8 h-8 text-amber-400 mt-1" />
              </div>
              {topComp > myMentions && (
                <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-amber-100">
                  Top competitor mentioned <strong>{topComp}×</strong> vs your <strong>{myMentions}×</strong>
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Estimated monthly opportunity</p>
              {revenueMax && revenueMax > 0 ? (
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-gray-900">
                    €{revenueMin?.toLocaleString()} – €{revenueMax.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">estimated additional revenue/month</p>
                  {visitorsMin && visitorsMax && (
                    <p className="text-sm text-gray-600">{visitorsMin}–{visitorsMax} additional visitors/month</p>
                  )}
                  <p className="text-xs text-gray-400">{ESTIMATE_CAVEAT}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Not enough data to estimate yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
          <CardHeader><CardTitle>Competitor comparison</CardTitle></CardHeader>
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
                  <div key={comp.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-40 shrink-0">
                      <p className="text-sm text-gray-700 truncate">{comp.name}</p>
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-full rounded-full ${ahead ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm text-gray-600 w-20 text-right">{comp.mention_count} mentions</span>
                    <span className={`text-xs w-12 text-right font-medium ${ahead ? 'text-red-500' : 'text-emerald-500'}`}>
                      {ahead ? `+${comp.mention_count - myMentions}` : `-${myMentions - comp.mention_count}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Website signals */}
      {websiteAudit && (
        <Card className="mb-5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Website signals</CardTitle>
              {entity.website && (
                <a href={entity.website.startsWith('http') ? entity.website : `https://${entity.website}`}
                  target="_blank" rel="noreferrer"
                  className="text-xs text-blue-500 hover:underline">
                  {entity.website}
                </a>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <div>
                <CheckRow label="Schema.org markup"    value={websiteAudit.schema_present} />
                <CheckRow label="Content / services"   value={websiteAudit.menu_present} />
                <CheckRow label="Hours / schedule"     value={websiteAudit.opening_hours_present} />
              </div>
              <div>
                <CheckRow label="Booking / contact"    value={websiteAudit.reservation_links_present} />
                <CheckRow label="Social media links"   value={websiteAudit.social_links_present} />
              </div>
            </div>
            {(websiteAudit.meta_title || websiteAudit.meta_description) && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md text-xs space-y-1">
                {websiteAudit.meta_title && <p><span className="text-gray-400">Title:</span> {websiteAudit.meta_title}</p>}
                {websiteAudit.meta_description && <p><span className="text-gray-400">Description:</span> {websiteAudit.meta_description}</p>}
                {websiteAudit.review_count != null && <p><span className="text-gray-400">Reviews detected:</span> {websiteAudit.review_count}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommendations + Fix Now */}
      <Recommendations auditId={id} />

      {audit.error_message && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 mt-4">
          <strong>Error:</strong> {audit.error_message}
        </div>
      )}
    </div>
  )
}
