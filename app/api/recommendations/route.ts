import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { computeMetrics } from '@/lib/engine/metrics'
import { buildRunAccounting } from '@/lib/engine/audit-evidence'
import { reliabilityFromAccounting } from '@/lib/audit/reliability'
import { resolveAuditLanguage } from '@/lib/settings'
import { LANGUAGE_NAME_EN } from '@/lib/i18n'
import { loadObservations, ObsRow } from '@/lib/observations'
import { RECOMMENDATION_VERSION } from '@/lib/versions'
import { emitEvent } from '@/lib/audit/events'
import { parseRecommendations } from '@/lib/recommendations/parse'
import { buildRecommendationPrompt } from '@/lib/recommendations/prompt'
import { enrichRecommendation, shapeStoredRec, type RawRecommendation } from '@/lib/recommendations/enrich'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * Generate recommendations for an audit. Clear layers (#8):
 *   1. measured facts + derived metrics  → assembled here from the DB
 *   2. prompt (text-only contract)        → lib/recommendations/prompt.ts
 *   3. LLM writes prose only              → the Anthropic call below
 *   4. deterministic enrichment           → lib/recommendations/enrich.ts
 * The model never computes a number; benchmarks, confidence, priority and
 * data-source attribution are all derived in pure code.
 */
export async function POST(request: NextRequest) {
  const { audit_id } = await request.json()
  if (!audit_id) return NextResponse.json({ error: 'audit_id required' }, { status: 400 })

  const { data: audit } = await supabaseAdmin
    .from('audits')
    .select('*, restaurant:restaurants(*)')
    .eq('id', audit_id)
    .single()
  if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 })

  // Reliability gate: never generate recommendations from an audit that didn't
  // clear the minimum share of successful model calls.
  const { data: relRuns } = await supabaseAdmin
    .from('model_runs').select('model, raw_response, status').eq('audit_id', audit_id)
  const reliability = reliabilityFromAccounting(buildRunAccounting((relRuns ?? []) as any[]))
  if (!reliability.allow.recommendations) {
    return NextResponse.json(
      { error: `Audit reliability too low to generate recommendations. ${reliability.detail} Re-run the audit first.`, reliability },
      { status: 422 },
    )
  }

  const [{ data: mentions }, { data: websiteAudit }, { data: promptRuns }, { data: competitors }, { data: vs }, { data: competitorAudits }] = await Promise.all([
    supabaseAdmin.from('mentions').select('model, prompt_id, mentioned, mention_frequency, position, sentiment').eq('audit_id', audit_id),
    supabaseAdmin.from('website_audits').select('*').eq('audit_id', audit_id).single(),
    supabaseAdmin.from('prompt_runs').select('prompt_id, category, prompt_text').eq('audit_id', audit_id),
    supabaseAdmin.from('competitors').select('name, mention_count, providers').eq('audit_id', audit_id).order('mention_count', { ascending: false }).limit(5),
    supabaseAdmin.from('visibility_scores').select('score_breakdown, visibility_score, confidence_score').eq('audit_id', audit_id).single(),
    supabaseAdmin.from('competitor_audits').select('competitor_name, website, signals').eq('audit_id', audit_id),
  ])

  const restaurant = audit.restaurant as {
    id: string; name: string; city: string; cuisine: string | null; website: string | null; country?: string | null
  }
  const metrics = computeMetrics(mentions ?? [])
  const language = await resolveAuditLanguage(restaurant.country)
  const obsRows: ObsRow[] = await loadObservations()

  // Layer 1+2: assemble facts → prompt (text-only contract).
  const prompt = buildRecommendationPrompt({
    restaurant,
    metrics,
    mentions: (mentions ?? []) as any[],
    promptRuns: (promptRuns ?? []) as any[],
    competitors: (competitors ?? []) as any[],
    websiteAudit: websiteAudit ?? null,
    competitorAudits: (competitorAudits ?? []) as any[],
    scoreBreakdownComponents: (vs?.score_breakdown as { components?: { label: string; score: number }[] } | null)?.components ?? null,
    visibilityScore: vs?.visibility_score ?? null,
    obsRows,
    langName: LANGUAGE_NAME_EN[language],
  })

  try {
    // Layer 3: the model writes prose only.
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
    const rawRecs = parseRecommendations(text) as RawRecommendation[]
    if (rawRecs.length === 0) {
      return NextResponse.json({ error: 'The model returned no usable recommendations. Please try again.' }, { status: 502 })
    }

    // Layer 4: deterministic enrichment (numbers/classifications computed in code).
    await supabaseAdmin.from('recommendations').delete().eq('audit_id', audit_id)
    const { data: insertedRecs } = await supabaseAdmin
      .from('recommendations')
      .insert(rawRecs.map((rec) => enrichRecommendation(rec, {
        auditId: audit_id, restaurantId: restaurant.id, cuisine: restaurant.cuisine, language, obsRows,
      })))
      .select()

    const recommendations = (insertedRecs ?? []).map((r: any, i: number) => shapeStoredRec(r, rawRecs[i]))

    await emitEvent(audit_id, 'recommendations.generated', { data: { count: recommendations.length, version: RECOMMENDATION_VERSION } })

    // Also store as JSON blob for backward compat.
    await supabaseAdmin.from('audits').update({ recommendations: JSON.stringify(recommendations) }).eq('id', audit_id)

    return NextResponse.json({ recommendations, restaurant_id: restaurant.id })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate recommendations' },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const audit_id = searchParams.get('audit_id')
  if (!audit_id) return NextResponse.json({ error: 'audit_id required' }, { status: 400 })

  // Try database first.
  const { data: dbRecs } = await supabaseAdmin
    .from('recommendations')
    .select('*')
    .eq('audit_id', audit_id)
    .order('created_at', { ascending: true })

  if (dbRecs && dbRecs.length > 0) {
    const { data: audit } = await supabaseAdmin
      .from('audits').select('restaurant_id').eq('id', audit_id).single()
    return NextResponse.json({
      recommendations: dbRecs.map((r) => shapeStoredRec(r)),
      restaurant_id: audit?.restaurant_id ?? null,
    })
  }

  // Fall back to the legacy JSON blob.
  const { data: audit } = await supabaseAdmin
    .from('audits').select('recommendations, restaurant_id').eq('id', audit_id).single()
  if (audit?.recommendations) {
    return NextResponse.json({
      recommendations: JSON.parse(audit.recommendations),
      restaurant_id: audit.restaurant_id,
    })
  }
  return NextResponse.json({ recommendations: null, restaurant_id: null })
}
