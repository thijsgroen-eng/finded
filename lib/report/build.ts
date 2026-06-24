import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { supabaseAdmin } from '@/lib/supabase/client'
import { computeMetrics } from '@/lib/engine/metrics'
import { asLanguage, languageForCountry, Language } from '@/lib/i18n'
import { toWebsiteSignals } from '@/lib/audit/website-signals'
import { ReportDocument, ReportData, ReportVariant, normalizeVariant } from '@/lib/report/report-document'

export type BuildResult =
  | { ok: true; buffer: Buffer; filename: string; restaurantName: string; language: Language }
  | { ok: false; status: number; error: string }

/**
 * Build a plan-specific report PDF for an audit. Shared by the streaming route
 * (/api/report/[id]/pdf) and the admin "email report" action so both produce the
 * exact same document. `variant` is the plan (free | audit | implementation;
 * full/teaser aliases accepted).
 */
export async function buildReportPdf(
  auditId: string,
  variant: ReportVariant,
  langParam?: string | null,
): Promise<BuildResult> {
  const { data: audit } = await supabaseAdmin
    .from('audits')
    .select('id, created_at, restaurant:restaurants(name, city, cuisine, country)')
    .eq('id', auditId)
    .single()
  if (!audit) return { ok: false, status: 404, error: 'Audit not found' }

  const restaurant = (audit.restaurant ?? {}) as { name?: string; city?: string | null; cuisine?: string | null; country?: string | null }
  const language: Language = langParam ? asLanguage(langParam) : languageForCountry(restaurant.country)

  const [{ data: vs }, { data: mentions }, { data: competitors }, { data: recommendations }, { data: websiteAudit }] = await Promise.all([
    supabaseAdmin.from('visibility_scores').select('*').eq('audit_id', auditId).single(),
    supabaseAdmin.from('mentions').select('model, prompt_id, mentioned, mention_frequency, position, sentiment').eq('audit_id', auditId),
    supabaseAdmin.from('competitors').select('name, mention_count').eq('audit_id', auditId).order('mention_count', { ascending: false }).limit(8),
    supabaseAdmin.from('recommendations').select('title, description, priority, suggested_fix, expected_impact').eq('audit_id', auditId).order('created_at', { ascending: true }),
    supabaseAdmin.from('website_audits').select('*').eq('audit_id', auditId).single(),
  ])

  if (!vs) return { ok: false, status: 409, error: 'Audit not complete — no visibility score yet' }

  const metrics = computeMetrics(mentions ?? [])

  const data: ReportData = {
    restaurantName: restaurant.name ?? 'Business',
    city: restaurant.city ?? null,
    cuisine: restaurant.cuisine ?? null,
    auditDate: new Date(audit.created_at).toLocaleDateString(language === 'nl' ? 'nl-NL' : 'en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    }),
    visibilityScore: Number(vs.visibility_score ?? 0),
    mentionFrequency: Number(vs.mention_frequency ?? metrics.mention_frequency ?? 0),
    confidenceLo: vs.confidence_lo != null ? Number(vs.confidence_lo) : null,
    confidenceHi: vs.confidence_hi != null ? Number(vs.confidence_hi) : null,
    sampleCount: vs.sample_count != null ? Number(vs.sample_count) : null,
    modelConsensus: Number(vs.model_consensus ?? metrics.model_consensus ?? 0),
    modelBreakdown: metrics.model_breakdown
      .filter((m) => m.total_prompts > 0)
      .map((m) => ({ model: m.model, frequency: m.frequency, mentions: m.mentions })),
    sentiment: {
      positive: Number(vs.sentiment_positive ?? metrics.sentiment_breakdown.positive ?? 0),
      neutral: Number(vs.sentiment_neutral ?? metrics.sentiment_breakdown.neutral ?? 0),
      negative: Number(vs.sentiment_negative ?? metrics.sentiment_breakdown.negative ?? 0),
    },
    competitors: (competitors ?? []).map((c) => ({ name: c.name, mention_count: Number(c.mention_count ?? 0) })),
    recommendations: (recommendations ?? []).map((r) => ({
      title: r.title ?? '', description: r.description ?? '', priority: r.priority ?? 'medium',
      suggested_fix: r.suggested_fix ?? null, expected_impact: r.expected_impact ?? null,
    })),
    websiteSignals: (() => {
      const sig = toWebsiteSignals(websiteAudit)
      return sig.length ? { present: sig.filter((s) => s.status === 'present').length, total: sig.length } : null
    })(),
    formulaVersion: (vs.score_breakdown as { method_version?: string } | null)?.method_version ?? null,
  }

  const buffer = await renderToBuffer(React.createElement(ReportDocument, { data, language, variant }))
  const slug = data.restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const filename = `${slug || 'report'}-${normalizeVariant(variant)}-${language}.pdf`

  return { ok: true, buffer: buffer as Buffer, filename, restaurantName: data.restaurantName, language }
}
