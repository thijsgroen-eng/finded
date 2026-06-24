import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { supabaseAdmin } from '@/lib/supabase/client'
import { computeMetrics } from '@/lib/engine/metrics'
import { asLanguage, languageForCountry, Language } from '@/lib/i18n'
import { ReportDocument, ReportData, ReportVariant } from '@/lib/report/report-document'
import { ADMIN_COOKIE, isValidSession, adminAuthDisabledInDev } from '@/lib/auth/admin'
import { toWebsiteSignals } from '@/lib/audit/website-signals'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/report/[id]/pdf?lang=nl|en&variant=full|teaser
 * Streams the audit report as a PDF. `id` is the audit id.
 *  - full   → everything (internal / your copy) — ADMIN ONLY
 *  - teaser → hides competitor names + the fixes, adds an "unlock" CTA (public lead magnet)
 *
 * The full variant carries the paid content (competitors + fixes), so it requires
 * a valid admin session. The teaser is intentionally public.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const url = new URL(request.url)
  const variant: ReportVariant = url.searchParams.get('variant') === 'teaser' ? 'teaser' : 'full'
  const langParam = url.searchParams.get('lang')

  // The full report is admin-only; the teaser stays public.
  if (variant === 'full' && !adminAuthDisabledInDev()) {
    const authed = await isValidSession(request.cookies.get(ADMIN_COOKIE)?.value)
    if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: audit } = await supabaseAdmin
    .from('audits')
    .select('id, created_at, restaurant:restaurants(name, city, cuisine, country)')
    .eq('id', id)
    .single()

  if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
  const restaurant = (audit.restaurant ?? {}) as { name?: string; city?: string | null; cuisine?: string | null; country?: string | null }

  const language: Language = langParam ? asLanguage(langParam) : languageForCountry(restaurant.country)

  const [{ data: vs }, { data: mentions }, { data: competitors }, { data: recommendations }, { data: websiteAudit }] = await Promise.all([
    supabaseAdmin.from('visibility_scores').select('*').eq('audit_id', id).single(),
    supabaseAdmin.from('mentions').select('model, prompt_id, mentioned, mention_frequency, position, sentiment').eq('audit_id', id),
    supabaseAdmin.from('competitors').select('name, mention_count').eq('audit_id', id).order('mention_count', { ascending: false }).limit(8),
    supabaseAdmin.from('recommendations').select('title, description, priority').eq('audit_id', id).order('created_at', { ascending: true }),
    supabaseAdmin.from('website_audits').select('*').eq('audit_id', id).single(),
  ])

  if (!vs) {
    return NextResponse.json({ error: 'Audit not complete — no visibility score yet' }, { status: 409 })
  }

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
    })),
    websiteSignals: (() => {
      const sig = toWebsiteSignals(websiteAudit)
      return sig.length ? { present: sig.filter((s) => s.status === 'present').length, total: sig.length } : null
    })(),
    formulaVersion: (vs.score_breakdown as { method_version?: string } | null)?.method_version ?? null,
  }

  const buffer = await renderToBuffer(
    React.createElement(ReportDocument, { data, language, variant })
  )

  const slug = data.restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${slug || 'report'}-${variant}-${language}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
