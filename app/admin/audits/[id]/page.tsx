import { supabaseAdmin } from '@/lib/supabase/client'
import { computeMetrics } from '@/lib/engine/metrics'
import { Card, CardHeader, CardTitle, CardContent, Badge, StatCard } from '@/components/ui'
import { formatDateTime, formatPercent, statusVariant } from '@/lib/utils'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { Recommendations } from '@/components/admin/recommendations'
import { LeadStatus } from '@/components/admin/lead-status'

async function getAuditData(id: string) {
  const { data: audit } = await supabaseAdmin
    .from('audits')
    .select('*, restaurant:restaurants(id, name, city, cuisine, website)')
    .eq('id', id)
    .single()

  if (!audit) return null

  const restaurant = audit.restaurant as { id: string; name: string; city: string; cuisine: string | null; website: string | null }

  const [
    { data: websiteAudit },
    { data: mentions },
    { data: modelRuns },
    { data: leadStatus },
    { data: visibilityScore },
    { data: competitors },
  ] = await Promise.all([
    supabaseAdmin.from('website_audits').select('*').eq('audit_id', id).single(),
    supabaseAdmin.from('mentions').select('model, prompt_id, mentioned, position, sentiment').eq('audit_id', id),
    supabaseAdmin.from('model_runs').select('model, duration_ms, tokens_used').eq('audit_id', id),
    supabaseAdmin.from('lead_statuses').select('*').eq('restaurant_id', restaurant.id).single(),
    supabaseAdmin.from('visibility_scores').select('*').eq('audit_id', id).single(),
    supabaseAdmin.from('competitors').select('*').eq('audit_id', id).order('mention_count', { ascending: false }).limit(6),
  ])

  const metrics = computeMetrics(mentions ?? [])

  return { audit, websiteAudit, metrics, modelRuns: modelRuns ?? [], leadStatus, visibilityScore, competitors: competitors ?? [] }
}

const MODEL_LABELS: Record<string, string> = {
  openai: 'ChatGPT (OpenAI)',
  anthropic: 'Claude (Anthropic)',
  gemini: 'Gemini (Google)',
  perplexity: 'Perplexity',
}

function CheckRow({ label, value }: { label: string; value: boolean | null }) {
  if (value === null) return null
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      {value ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      ) : (
        <XCircle className="w-4 h-4 text-gray-300" />
      )}
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

  const { audit, websiteAudit, metrics, leadStatus, visibilityScore, competitors } = data
  const restaurant = audit.restaurant as {
    id: string; name: string; city: string; cuisine: string | null; website: string | null
  }

  const totalPrompts = audit.total_prompts ?? metrics.total_prompts
  const totalModelRuns = audit.total_model_runs ?? data.modelRuns.length

  const positionLabel = metrics.position_score >= 80
    ? 'Excellent'
    : metrics.position_score >= 60
    ? 'Good'
    : metrics.position_score >= 30
    ? 'Fair'
    : 'Poor'

  const opportunityScore = visibilityScore?.opportunity_score ?? null
  const opportunityLabel = visibilityScore?.opportunity_label ?? null
  const visScore = visibilityScore?.visibility_score ?? null
  const estimatedRevenueMin = visibilityScore?.estimated_revenue_min ?? null
  const estimatedRevenueMax = visibilityScore?.estimated_revenue_max ?? null
  const estimatedVisitorsMin = visibilityScore?.estimated_visitors_min ?? null
  const estimatedVisitorsMax = visibilityScore?.estimated_visitors_max ?? null

  const opportunityColor = opportunityScore !== null
    ? opportunityScore >= 75 ? 'text-red-600'
    : opportunityScore >= 50 ? 'text-amber-600'
    : opportunityScore >= 25 ? 'text-blue-600'
    : 'text-gray-500'
    : 'text-gray-400'

  const topCompetitorMentions = competitors[0]?.mention_count ?? 0
  const myMentions = metrics.total_mentions

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Back + header */}
      <div className="mb-6">
        <Link
          href="/admin/audits"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All audits
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{restaurant.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {restaurant.city}
              {restaurant.cuisine ? ` · ${restaurant.cuisine}` : ''}
              {' · '}
              Audited {formatDateTime(audit.created_at)}
            </p>
          </div>
          <Badge variant={statusVariant(audit.status) as 'success' | 'warning' | 'danger' | 'info' | 'default'}>
            {audit.status}
          </Badge>
        </div>
      </div>

      {/* Core metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Mention frequency"
          value={formatPercent(metrics.mention_frequency)}
          sub={`${metrics.total_mentions} of ${totalPrompts} prompts`}
        />
        <StatCard
          label="Position score"
          value={`${Math.round(metrics.position_score)}/100`}
          sub={positionLabel}
        />
        <StatCard
          label="Model consensus"
          value={`${metrics.model_consensus}/4`}
          sub="models that mentioned"
        />
        <StatCard
          label="Prompts run"
          value={totalPrompts}
          sub={`${totalModelRuns} model runs total`}
        />
      </div>

      {/* Opportunity + Revenue */}
      {opportunityScore !== null && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <Card className="border-amber-100 bg-amber-50/30">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">AI opportunity score</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-bold ${opportunityColor}`}>{Math.round(opportunityScore)}</span>
                    <span className="text-gray-400 text-lg">/100</span>
                  </div>
                  {opportunityLabel && (
                    <span className={`text-xs font-medium mt-1 inline-block ${opportunityColor}`}>
                      {opportunityLabel.replace('_', ' ')} opportunity
                    </span>
                  )}
                </div>
                <TrendingUp className="w-8 h-8 text-amber-400 mt-1" />
              </div>
              {topCompetitorMentions > myMentions && (
                <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-amber-100">
                  Top competitor is mentioned <strong>{topCompetitorMentions}×</strong> vs your <strong>{myMentions}×</strong> — closing this gap is the primary growth lever.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Potential monthly opportunity</p>
              {estimatedRevenueMin !== null && estimatedRevenueMax !== null && estimatedRevenueMax > 0 ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      €{estimatedRevenueMin.toLocaleString()} – €{estimatedRevenueMax.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">estimated additional revenue/month</p>
                  </div>
                  {estimatedVisitorsMin !== null && estimatedVisitorsMax !== null && (
                    <p className="text-sm text-gray-600">
                      {estimatedVisitorsMin}–{estimatedVisitorsMax} additional visitors/month
                    </p>
                  )}
                  <p className="text-xs text-gray-400">Based on visibility gap vs top competitors</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Not enough data to estimate yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Competitor benchmarking */}
      {competitors.length > 0 && (
        <Card className="mb-5">
          <CardHeader><CardTitle>Competitor comparison</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {/* Target restaurant row */}
              <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                <div className="w-40 flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{restaurant.name}</p>
                  <p className="text-xs text-blue-500">You</p>
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gray-900"
                    style={{ width: `${Math.min(100, (myMentions / Math.max(topCompetitorMentions, myMentions, 1)) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900 w-16 text-right">{myMentions} mentions</span>
                {visScore !== null && (
                  <span className="text-sm text-gray-500 w-16 text-right">{Math.round(visScore)}/100</span>
                )}
              </div>
              {/* Competitor rows */}
              {competitors.map((comp) => {
                const pct = Math.min(100, (comp.mention_count / Math.max(topCompetitorMentions, myMentions, 1)) * 100)
                const isAhead = comp.mention_count > myMentions
                return (
                  <div key={comp.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-40 flex-shrink-0">
                      <p className="text-sm text-gray-700 truncate">{comp.name}</p>
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isAhead ? 'bg-red-400' : 'bg-emerald-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-16 text-right">{comp.mention_count} mentions</span>
                    <span className={`text-xs w-16 text-right font-medium ${isAhead ? 'text-red-500' : 'text-emerald-500'}`}>
                      {isAhead ? `+${comp.mention_count - myMentions}` : `-${myMentions - comp.mention_count}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model breakdown + sentiment + lead status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Card>
          <CardHeader><CardTitle>AI model breakdown</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {metrics.model_breakdown.map((mb) => (
                <div key={mb.model} className="flex items-center gap-3">
                  <div className="w-32 flex-shrink-0">
                    <p className="text-sm font-medium text-gray-700">{MODEL_LABELS[mb.model] ?? mb.model}</p>
                    <p className="text-xs text-gray-400">{mb.mentions} mentions</p>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gray-900 transition-all"
                      style={{ width: `${Math.round(mb.frequency * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-10 text-right">
                    {Math.round(mb.frequency * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Sentiment breakdown</CardTitle></CardHeader>
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
                  const pct = metrics.total_mentions > 0 ? (count / metrics.total_mentions) * 100 : 0
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 w-16">{label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                        {count} <span className="text-gray-400 font-normal text-xs">({Math.round(pct)}%)</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Lead status</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <LeadStatus
              restaurantId={restaurant.id}
              initialStatus={leadStatus?.status ?? null}
              initialNotes={leadStatus?.notes ?? null}
              initialNextFollowup={leadStatus?.next_followup_at ?? null}
            />
          </CardContent>
        </Card>
      </div>

      {/* Website audit */}
      {websiteAudit ? (
        <Card className="mb-5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Website audit</CardTitle>
              {restaurant.website && (
                <a
                  href={restaurant.website.startsWith('http') ? restaurant.website : `https://${restaurant.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-500 hover:underline"
                >
                  {restaurant.website}
                </a>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <div>
                <CheckRow label="Schema.org markup"       value={websiteAudit.schema_present} />
                <CheckRow label="Menu page detected"      value={websiteAudit.menu_present} />
                <CheckRow label="Opening hours present"   value={websiteAudit.opening_hours_present} />
              </div>
              <div>
                <CheckRow label="Reservation link"        value={websiteAudit.reservation_links_present} />
                <CheckRow label="Social media links"      value={websiteAudit.social_links_present} />
              </div>
            </div>
            {(websiteAudit.meta_title || websiteAudit.meta_description) && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md text-xs space-y-1">
                {websiteAudit.meta_title && (
                  <p><span className="text-gray-400">Title:</span> {websiteAudit.meta_title}</p>
                )}
                {websiteAudit.meta_description && (
                  <p><span className="text-gray-400">Description:</span> {websiteAudit.meta_description}</p>
                )}
                {websiteAudit.review_count !== null && (
                  <p><span className="text-gray-400">Reviews detected:</span> {websiteAudit.review_count}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-5">
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
              <AlertCircle className="w-4 h-4" />
              No website audit data available
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations */}
      <Recommendations auditId={id} />

      {audit.error_message && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          <strong>Error:</strong> {audit.error_message}
        </div>
      )}
    </div>
  )
}
