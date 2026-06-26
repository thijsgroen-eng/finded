import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { supabaseAdmin } from '@/lib/supabase/client'
import { computeMetrics } from '@/lib/engine/metrics'
import { asLanguage, Language } from '@/lib/i18n'
import { resolveAuditLanguage } from '@/lib/settings'
import { toWebsiteSignals, gapSignals } from '@/lib/audit/website-signals'
import { buildAuthoritySignals } from '@/lib/audit/authority'
import { buildRunAccounting, buildPromptEvidence } from '@/lib/engine/audit-evidence'
import { buildDataQuality } from '@/lib/audit/data-quality'
import { buildKeyFindings } from '@/lib/audit/findings'
import { buildCompetitorComparison } from '@/lib/audit/competitor-comparison'
import { reliabilityFromAccounting } from '@/lib/audit/reliability'
import { loadObservations, computeBenchmark, computePatterns, patternEvidence } from '@/lib/observations'
import { visibilityStatus, websiteSnapshot, categoryPerformance, actionPlanWeeks, roadmap90 } from '@/lib/audit/report-sections'
import { ReportDocument, ReportData, ReportVariant, normalizeVariant } from '@/lib/report/report-document'

export type BuildResult =
  | { ok: true; buffer: Buffer; filename: string; restaurantName: string; language: Language }
  | { ok: false; status: number; error: string }

/**
 * Build a tier-specific report PDF for an audit. Shared by the streaming route
 * and the admin "email report" action. `variant` is the plan (free | audit |
 * implementation; full/teaser aliases accepted). Each tier gets a different slice
 * of the same stored evidence — free is a concise teaser, audit is the full
 * "why", implementation compiles execution deliverables.
 */
export async function buildReportPdf(
  auditId: string,
  variant: ReportVariant,
  langParam?: string | null,
): Promise<BuildResult> {
  const plan = normalizeVariant(variant)

  const { data: audit } = await supabaseAdmin
    .from('audits')
    .select('id, restaurant_id, created_at, status, restaurant:restaurants(name, city, cuisine, country, domain)')
    .eq('id', auditId)
    .single()
  if (!audit) return { ok: false, status: 404, error: 'Audit not found' }

  // Incomplete audits (reliability gate) never produced a score — refuse to
  // render a report that would present low-confidence data as findings.
  if (audit.status === 'incomplete') {
    return { ok: false, status: 409, error: 'Audit is incomplete (too many model calls failed). Re-run the audit before generating a report.' }
  }

  const restaurant = (audit.restaurant ?? {}) as { name?: string; city?: string | null; cuisine?: string | null; country?: string | null; domain?: string | null }
  // Explicit ?lang wins; otherwise the operator's Settings decide (default Dutch).
  const language: Language = langParam ? asLanguage(langParam) : await resolveAuditLanguage(restaurant.country)

  const [{ data: vs }, { data: mentions }, { data: competitors }, { data: recommendations }, { data: websiteAudit }, { data: modelRuns }, { data: promptRuns }, { data: entities }] = await Promise.all([
    supabaseAdmin.from('visibility_scores').select('*').eq('audit_id', auditId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabaseAdmin.from('mentions').select('model, prompt_id, mentioned, mention_frequency, position, sentiment, sample_index').eq('audit_id', auditId),
    supabaseAdmin.from('competitors').select('name, mention_count, providers').eq('audit_id', auditId).order('mention_count', { ascending: false }).limit(8),
    supabaseAdmin.from('recommendations').select('title, description, priority, suggested_fix, expected_impact, priority_rank, impact_level, effort').eq('audit_id', auditId).order('created_at', { ascending: true }),
    supabaseAdmin.from('website_audits').select('*').eq('audit_id', auditId).single(),
    supabaseAdmin.from('model_runs').select('model, prompt_id, sample_index, grounded, model_version, locale, duration_ms, raw_response, status, sources').eq('audit_id', auditId),
    supabaseAdmin.from('prompt_runs').select('prompt_id, category, intent, prompt_text').eq('audit_id', auditId),
    supabaseAdmin.from('entities').select('prompt_id, model, name, confidence, is_target, normalized_name').eq('audit_id', auditId),
  ])

  // Crawled competitor sites → signal-by-signal comparison ("why competitors may be winning").
  const { data: competitorAudits } = await supabaseAdmin
    .from('competitor_audits').select('competitor_name, website, signals').eq('audit_id', auditId)

  if (!vs) return { ok: false, status: 409, error: 'No visibility score for this audit yet — re-run the audit, then generate the report.' }

  // For the implementation package, pull the generated execution assets.
  let generatedAssets: { type: string; title: string; content: string; format: string }[] = []
  if (plan === 'implementation') {
    const { data: assets } = await supabaseAdmin
      .from('generated_assets').select('type, title, content, format, created_at')
      .eq('audit_id', auditId).order('created_at', { ascending: false })
    // newest per type
    const seen = new Set<string>()
    generatedAssets = (assets ?? []).filter((a) => !seen.has(a.type) && seen.add(a.type))
      .map((a) => ({ type: a.type, title: a.title ?? a.type, content: a.content ?? '', format: a.format ?? 'text' }))
  }

  const metrics = computeMetrics(mentions ?? [])
  const runAccounting = buildRunAccounting(modelRuns ?? [])
  const reliability = reliabilityFromAccounting(runAccounting)
  const dataQuality = buildDataQuality({ total_runs: runAccounting.total_runs, completed: runAccounting.completed, providers: runAccounting.providers }, language)
  const allSources = (modelRuns ?? []).flatMap((r) => (Array.isArray(r.sources) ? r.sources : []))
  const authority = buildAuthoritySignals(allSources, restaurant.domain)
  const wsSignals = toWebsiteSignals(websiteAudit, { cuisine: restaurant.cuisine, city: restaurant.city }, language)
  const promptEv = buildPromptEvidence(promptRuns ?? [], mentions ?? [], modelRuns ?? [], entities ?? [])
  const competitorComparison = buildCompetitorComparison(
    websiteAudit ?? {},
    (competitorAudits ?? []).map((ca) => ({ name: ca.competitor_name, website: ca.website, signals: ca.signals })),
    language,
  )

  // Industry insights from the Observation Engine — benchmark this restaurant's
  // segment + measured patterns. Gated on sample size so we never show thin stats.
  const obsRows = await loadObservations()
  const segment = computeBenchmark(obsRows, { cuisine: restaurant.cuisine, city: restaurant.city })
  const patternLines = computePatterns(obsRows).slice(0, 3).map((p) => patternEvidence(p, language))
  const SEG_MIN = 8
  const industryInsights = (segment.n >= SEG_MIN || patternLines.length > 0)
    ? {
        segmentLabel: [restaurant.cuisine, restaurant.city].filter(Boolean).join(' · ') || (language === 'nl' ? 'alle restaurants' : 'all restaurants'),
        segmentN: segment.n,
        avgVisibility: segment.n >= SEG_MIN && segment.avgVisibility != null ? Math.round(segment.avgVisibility) : null,
        pctMentioned: segment.n >= SEG_MIN ? Math.round(segment.pctMentioned * 100) : null,
        yourVisibility: Math.round(Number(vs.visibility_score ?? 0)),
        patterns: patternLines,
      }
    : null

  const mentioned = metrics.total_mentions > 0
  const mentionFreqPct = Number(vs.mention_frequency ?? metrics.mention_frequency ?? 0) * 100
  const recs = (recommendations ?? []).map((r) => ({
    title: r.title ?? '', description: r.description ?? '', priority: r.priority ?? 'medium',
    suggested_fix: r.suggested_fix ?? null, expected_impact: r.expected_impact ?? null,
    priority_rank: r.priority_rank ?? null, impact_level: r.impact_level ?? null, effort: r.effort ?? null,
  }))

  const data: ReportData = {
    restaurantName: restaurant.name ?? 'Business',
    city: restaurant.city ?? null,
    cuisine: restaurant.cuisine ?? null,
    auditDate: new Date(audit.created_at).toLocaleDateString(language === 'nl' ? 'nl-NL' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),

    status: visibilityStatus(mentionFreqPct, mentioned),
    appeared: { x: metrics.total_mentions, y: runAccounting.completed },
    dataQuality: { level: dataQuality.level, levelLabel: dataQuality.levelLabel, reason: dataQuality.reason },
    reliability: { band: reliability.band, headline: reliability.headline, detail: reliability.detail },

    visibilityScore: Number(vs.visibility_score ?? 0),
    opportunityScore: vs.opportunity_score != null ? Number(vs.opportunity_score) : null,
    mentionFrequency: Number(vs.mention_frequency ?? metrics.mention_frequency ?? 0),
    confidenceLo: vs.confidence_lo != null ? Number(vs.confidence_lo) : null,
    confidenceHi: vs.confidence_hi != null ? Number(vs.confidence_hi) : null,
    sampleCount: vs.sample_count != null ? Number(vs.sample_count) : null,
    modelConsensus: Number(vs.model_consensus ?? metrics.model_consensus ?? 0),
    modelBreakdown: metrics.model_breakdown.filter((m) => m.total_prompts > 0).map((m) => ({ model: m.model, frequency: m.frequency, mentions: m.mentions })),

    keyFindings: buildKeyFindings({
      mentioned, ownCited: authority.ownCited,
      presentSignals: wsSignals.filter((s) => s.status === 'present').map((s) => s.label),
      gapSignals: gapSignals(wsSignals).map((s) => s.label),
    }),
    websiteSnapshot: websiteSnapshot(wsSignals.map((s) => ({ key: s.key, status: s.status })), authority.ownCited, language),
    websiteReview: wsSignals.map((s) => ({ label: s.label, status: s.status, why: s.why ?? null, impact: s.impact ?? null, recommendation: s.recommendation ?? null })),
    authorityPlatforms: authority.platforms.map((p) => p.label),
    ownCited: authority.ownCited,

    competitors: (competitors ?? []).map((c) => ({
      name: c.name, mention_count: Number(c.mention_count ?? 0),
      providers: Array.isArray(c.providers) ? (c.providers as string[]) : [],
    })),
    promptEvidence: promptEv.map((p) => ({
      prompt: p.prompt_text ?? p.prompt_id,
      category: p.category,
      recommended: (p.top_competitors ?? []).map((c) => c.name),
      mentioned: p.mentioned_any,
      sources: p.sources ?? [],
    })),
    categoryPerformance: categoryPerformance(promptEv.map((p) => ({ category: p.category, mentioned_any: p.mentioned_any })), language),
    competitorComparison: {
      crawled: competitorComparison.crawled,
      rows: competitorComparison.rows.map((r) => ({ label: r.label, you: r.you, competitors: r.competitors })),
      whyWin: competitorComparison.whyWin,
      gaps: competitorComparison.gaps,
    },

    recommendations: recs,
    actionPlan: actionPlanWeeks(recs, language),
    roadmap: roadmap90(recs, language),
    generatedAssets,
    industryInsights,

    formulaVersion: (vs.score_breakdown as { method_version?: string } | null)?.method_version ?? null,
  }

  const buffer = await renderToBuffer(React.createElement(ReportDocument, { data, language, variant }))
  const slug = data.restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const filename = `${slug || 'report'}-${plan}-${language}.pdf`

  return { ok: true, buffer: buffer as Buffer, filename, restaurantName: data.restaurantName, language }
}
