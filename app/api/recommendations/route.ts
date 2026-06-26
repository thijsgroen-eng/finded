import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { computeMetrics } from '@/lib/engine/metrics'
import { FIX_TYPES, FIX_TYPE_HINTS, asFixType } from '@/lib/engine/fix-types'
import { asLevel, computePriorityRank } from '@/lib/audit/recommendation-priority'
import { buildCompetitorComparison } from '@/lib/audit/competitor-comparison'
import { buildRunAccounting } from '@/lib/engine/audit-evidence'
import { reliabilityFromAccounting } from '@/lib/audit/reliability'
import { resolveAuditLanguage } from '@/lib/settings'
import { LANGUAGE_NAME_EN } from '@/lib/i18n'
import { loadObservations, computePatterns, patternEvidence } from '@/lib/observations'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * Tolerant parse of the model's JSON array of recommendations. The model can hit
 * the token limit mid-string ("Unterminated string in JSON"), so when a strict
 * parse fails we salvage every COMPLETE {…} object up to the truncation point by
 * scanning for balanced braces (string-aware). Returns [] if nothing usable.
 */
function parseRecommendations(text: string): any[] {
  const clean = text.replace(/```json|```/g, '').trim()
  try {
    const v = JSON.parse(clean)
    if (Array.isArray(v)) return v
  } catch { /* fall through to salvage */ }

  const start = clean.indexOf('[')
  if (start === -1) return []
  const objs: any[] = []
  let depth = 0, inStr = false, esc = false, objStart = -1
  for (let i = start + 1; i < clean.length; i++) {
    const c = clean[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '{') { if (depth === 0) objStart = i; depth++ }
    else if (c === '}') {
      depth--
      if (depth === 0 && objStart >= 0) {
        try { objs.push(JSON.parse(clean.slice(objStart, i + 1))) } catch { /* skip partial */ }
        objStart = -1
      }
    }
  }
  return objs
}

export async function POST(request: NextRequest) {
  const { audit_id } = await request.json()

  if (!audit_id) {
    return NextResponse.json({ error: 'audit_id required' }, { status: 400 })
  }

  const { data: audit } = await supabaseAdmin
    .from('audits')
    .select('*, restaurant:restaurants(*)')
    .eq('id', audit_id)
    .single()

  if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 })

  // Reliability gate: never generate recommendations from an audit that didn't
  // clear the minimum share of successful model calls — they would be advice
  // built on too little data presented as fact.
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

  const metrics = computeMetrics(mentions ?? [])
  const restaurant = audit.restaurant as {
    id: string; name: string; city: string; cuisine: string | null; website: string | null
  }

  // Cuisine-specific visibility: the queries this restaurant can realistically
  // win. A miss here is the most actionable signal (the cuisine isn't associated
  // with the business in AI training/retrieval data).
  const appeared = new Map<string, boolean>()
  for (const m of mentions ?? []) {
    const did = m.mentioned || (m.mention_frequency ?? 0) > 0
    appeared.set(m.prompt_id, (appeared.get(m.prompt_id) ?? false) || did)
  }
  const cuisinePrompts = (promptRuns ?? []).filter(p => p.category === 'category')
  const wonCuisine = cuisinePrompts.filter(p => appeared.get(p.prompt_id)).map(p => p.prompt_text)
  const missedCuisine = cuisinePrompts.filter(p => !appeared.get(p.prompt_id)).map(p => p.prompt_text)
  const cuisineLabel = restaurant.cuisine ?? 'its cuisine'

  const cuisineAnalysis = cuisinePrompts.length === 0 ? '' : `

CUISINE-SPECIFIC VISIBILITY (the queries a ${cuisineLabel} restaurant should win):
- Appears for: ${wonCuisine.length ? wonCuisine.map(q => `"${q}"`).join(', ') : 'NONE'}
- MISSING from: ${missedCuisine.length ? missedCuisine.map(q => `"${q}"`).join(', ') : 'none — good coverage'}`

  const modelBreakdown = metrics.model_breakdown
    .map(m => `${m.model}: ${Math.round(m.frequency * 100)}% (${m.mentions} mentions)`)
    .join('\n')

  // Competitor gap: who AI recommends instead, and by how much.
  const myMentions = metrics.total_mentions
  const competitorGap = (competitors ?? []).length === 0
    ? '\n\nCOMPETITOR GAP: no competitors were extracted.'
    : `\n\nCOMPETITOR GAP (AI recommends these instead — close this gap):\n${(competitors ?? [])
        .map(c => `- ${c.name}: ${c.mention_count} mentions vs your ${myMentions}`).join('\n')}`

  // Competitor signal comparison: we DID crawl the top competitors' websites, so
  // we can connect "competitor signal → visibility outcome → suggested action".
  // Only signals actually detected appear here (no SEO/backlink/authority claims).
  const comparison = buildCompetitorComparison(
    websiteAudit ?? {},
    (competitorAudits ?? []).map((ca) => ({ name: ca.competitor_name, website: ca.website, signals: ca.signals })),
  )
  const competitorSignals = comparison.crawled === 0
    ? '\n\nCOMPETITOR WEBSITE SIGNALS: no competitor sites could be crawled — do NOT make any claims about competitors\' websites.'
    : `\n\nCOMPETITOR WEBSITE SIGNALS (${comparison.crawled} competitor site${comparison.crawled === 1 ? '' : 's'} crawled — these signals were actually detected, safe to cite):
Signal-by-signal grade (You vs competitors):
${comparison.rows.map((r) => `- ${r.label}: you=${r.you}; ${r.competitors.map((c) => `${c.name}=${c.grade ?? 'n/a'}`).join('; ')}`).join('\n')}
Why competitors may win:
${comparison.whyWin.map((w) => `- ${w.reasons}`).join('\n')}
Biggest competitive gaps (turn these into recommendations):
${comparison.gaps.length ? comparison.gaps.map((g) => `- ${g}`).join('\n') : '- none — your signals match or exceed the crawled competitors'}`

  // Stored score breakdown: target the weakest components.
  const breakdown = (vs?.score_breakdown as { components?: { label: string; score: number }[] } | null)?.components
  const scoreContext = breakdown?.length
    ? `\n\nSCORE BREAKDOWN (visibility ${vs?.visibility_score ?? '?'}/100 — weakest components are the priority):\n${breakdown
        .map(c => `- ${c.label}: ${Math.round(c.score)}/100`).join('\n')}`
    : ''

  const websiteSignals = websiteAudit ? `
- Schema.org markup: ${websiteAudit.schema_present ? 'Present' : 'MISSING'}
- Menu page: ${websiteAudit.menu_present ? 'Present' : 'MISSING'}
- Opening hours: ${websiteAudit.opening_hours_present ? 'Present' : 'MISSING'}
- Reservation link: ${websiteAudit.reservation_links_present ? 'Present' : 'MISSING'}
- Social media links: ${websiteAudit.social_links_present ? 'Present' : 'MISSING'}
- Meta title: ${websiteAudit.meta_title ?? 'Not found'}
- Meta description: ${websiteAudit.meta_description ?? 'Not found'}` : 'No website audit data available'

  const language = await resolveAuditLanguage((restaurant as { country?: string | null }).country)
  const langName = LANGUAGE_NAME_EN[language]

  // Proprietary evidence from the Observation Engine: measured patterns the model
  // may cite (so recommendations are evidence-backed, not generic SEO advice).
  const patterns = computePatterns(await loadObservations()).slice(0, 6)
  const measuredEvidence = patterns.length
    ? `\n\nMEASURED PATTERNS FROM FINDED'S DATASET (cite as evidence + set confidence when a recommendation matches one; these are real measurements across many audits):\n${patterns.map((p) => `- ${patternEvidence(p, 'en')} [confidence ${p.lift >= 2 ? 'High' : p.lift >= 1.4 ? 'Medium' : 'Low'}]`).join('\n')}`
    : '\n\nMEASURED PATTERNS: not enough audits in the dataset yet to cite measured lift — base confidence on the strength of the audit evidence instead.'

  const prompt = `You are an AI visibility consultant for restaurants. Analyse this restaurant's AI visibility audit and generate specific, actionable recommendations.

IMPORTANT: Write EVERY text field (title, what, why, evidence, impact) entirely in ${langName}. Do not mix languages.

RESTAURANT: ${restaurant.name}
CITY: ${restaurant.city}
CUISINE: ${restaurant.cuisine ?? 'Not specified'}
WEBSITE: ${restaurant.website ?? 'Not provided'}

AI VISIBILITY METRICS:
- Overall mention frequency: ${Math.round(metrics.mention_frequency * 100)}%
- Position score: ${Math.round(metrics.position_score)}/100
- Model consensus: ${metrics.model_consensus}/4 models mention this restaurant
- Total mentions: ${metrics.total_mentions} across ${metrics.total_prompts} prompts

PER-MODEL BREAKDOWN:
${modelBreakdown}

SENTIMENT: ${metrics.sentiment_breakdown.positive} positive, ${metrics.sentiment_breakdown.neutral} neutral, ${metrics.sentiment_breakdown.negative} negative

WEBSITE SIGNALS:
${websiteSignals}
${cuisineAnalysis}${competitorGap}${competitorSignals}${scoreContext}${measuredEvidence}

Generate exactly 5 specific, prioritised recommendations to improve this restaurant's AI visibility.
Base each recommendation on the evidence above: the weakest score components, missing website signals, the competitor gap, and the cuisine prompt misses.

Format your response as a JSON array with this exact structure:
[
  {
    "impact_level": "high|medium|low",
    "effort": "high|medium|low",
    "type": ${JSON.stringify([...FIX_TYPES])} or null,
    "title": "Short action title (max 8 words)",
    "what": "Exactly what to do (2-3 sentences, specific and actionable)",
    "why": "Why this will improve AI visibility (1-2 sentences)",
    "evidence": "The specific data point that triggered it — prefer a MEASURED PATTERN above when one matches (e.g. 'Restaurants with an HTML menu were mentioned 2.1× more often'), else a real number from THIS audit (e.g. 'Competitor De Kas named in 9 answers, you in 2')",
    "impact": "Expected impact, plainly stated (e.g. 'Helps you appear for cuisine queries you currently miss')",
    "confidence": "high|medium|low — how strongly the evidence supports the expected impact (High only when a measured pattern backs it)"
  }
]

Fix type guide (choose the closest, or null if none of these implement the fix):
${FIX_TYPES.map(ty => `- ${ty}: ${FIX_TYPE_HINTS[ty]}`).join('\n')}

Rules:
- "confidence" MUST be high/medium/low. Use "high" ONLY when a MEASURED PATTERN above supports the recommendation; otherwise medium or low. Never overstate.
- "type" MUST be exactly one of the listed values or null — do not invent types.
- "impact_level" = how much this is likely to move AI visibility; "effort" = how hard it is for the owner.
- "evidence" must quote a real number/signal from the audit data above, not a generality.
- Where relevant, tie the recommendation to the COMPETITOR GAP — reference the competitors that are named instead and the specific prompts where they appear and this restaurant doesn't.
- When COMPETITOR WEBSITE SIGNALS are available, connect the chain explicitly: competitor signal → why AI can recommend them → the specific action that closes the gap (e.g. "Competitor X has a crawlable HTML menu and you have a PDF — publish your menu as HTML text"). ONLY cite competitor website signals that appear in the COMPETITOR WEBSITE SIGNALS block above; if none were crawled, make NO claims about competitors' websites. Never mention domain authority, backlinks, or traditional SEO — only what AI can read and extract.
- Be SPECIFIC to this restaurant's actual data
- Prioritise by impact: fix what will move the needle most first
- Give concrete actions, not vague advice
- If a model shows 0%, explain specifically why and what to do
- Reference real platforms (Google Business Profile, TripAdvisor, etc.)
- PRIORITISE the cuisine-specific gaps above — a ${cuisineLabel} restaurant should appear for those queries. If it is MISSING from them, the top recommendations must make the cuisine explicit and machine-readable: state ${cuisineLabel} clearly in the homepage copy and meta description, add Restaurant schema with servesCuisine="${restaurant.cuisine ?? '...'}", and ensure the menu is crawlable (not an image/PDF).
- Do NOT recommend competing for generic "best restaurants in ${restaurant.city}" — that is not where a typical ${cuisineLabel} restaurant wins; focus on cuisine, occasion and neighbourhood queries.
- Write all text fields in ${langName}.
- Return ONLY the JSON array, no other text`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
    const rawRecs = parseRecommendations(text)
    if (rawRecs.length === 0) {
      return NextResponse.json({ error: 'The model returned no usable recommendations. Please try again.' }, { status: 502 })
    }

    // Delete old recommendations for this audit
    await supabaseAdmin
      .from('recommendations')
      .delete()
      .eq('audit_id', audit_id)

    // Insert new recommendations with IDs
    const { data: insertedRecs } = await supabaseAdmin
      .from('recommendations')
      .insert(
        rawRecs.map((rec: any) => {
          const fixType = asFixType(rec.type) // backend-authoritative, enum-validated (null if invalid)
          const impactLevel = asLevel(rec.impact_level ?? rec.priority)
          const effort = asLevel(rec.effort)
          const priorityRank = computePriorityRank(impactLevel, effort)
          return {
            audit_id,
            restaurant_id: restaurant.id,
            type: fixType,
            title: rec.title,
            description: rec.what,
            why: rec.why ?? null,
            evidence: rec.evidence ?? null,
            priority: impactLevel,            // keep priority = impact for existing UI colours
            impact: rec.impact,
            difficulty: rec.difficulty ?? null,
            status: 'pending',
            suggested_fix: rec.what ?? null,
            expected_impact: rec.impact ?? null,
            asset_type: fixType,
            // Prioritisation (014): Impact × Effort → where to start.
            impact_level: impactLevel,
            effort,
            priority_rank: priorityRank,
            confidence: asLevel(rec.confidence),  // evidence-backed confidence band (020)
          }
        })
      )
      .select()

    // Build response with IDs merged in
    const recommendations = rawRecs.map((rec: any, i: number) => {
      const impact_level = asLevel(rec.impact_level ?? rec.priority)
      const effort = asLevel(rec.effort)
      return {
        ...rec,
        id: insertedRecs?.[i]?.id ?? null,
        type: asFixType(rec.type),
        priority: impact_level,
        impact_level,
        effort,
        priority_rank: computePriorityRank(impact_level, effort),
        confidence: asLevel(rec.confidence),
        what: rec.what,
        status: 'pending',
      }
    })

    // Also store as JSON blob for backward compat
    await supabaseAdmin
      .from('audits')
      .update({ recommendations: JSON.stringify(recommendations) })
      .eq('id', audit_id)

    return NextResponse.json({ recommendations, restaurant_id: restaurant.id })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const audit_id = searchParams.get('audit_id')

  if (!audit_id) return NextResponse.json({ error: 'audit_id required' }, { status: 400 })

  // Try database first
  const { data: dbRecs } = await supabaseAdmin
    .from('recommendations')
    .select('*')
    .eq('audit_id', audit_id)
    .order('created_at', { ascending: true })

  if (dbRecs && dbRecs.length > 0) {
    // Get the audit's restaurant_id
    const { data: audit } = await supabaseAdmin
      .from('audits')
      .select('restaurant_id')
      .eq('id', audit_id)
      .single()

    const recommendations = dbRecs.map(r => ({
      id: r.id,
      type: r.type,
      priority: r.priority,
      impact_level: r.impact_level ?? r.priority ?? 'medium',
      effort: r.effort ?? 'medium',
      priority_rank: r.priority_rank ?? 'do_next',
      confidence: r.confidence ?? null,
      title: r.title,
      what: r.description,
      why: r.why ?? '',
      evidence: r.evidence ?? null,
      impact: r.impact ?? '',
      suggested_fix: r.suggested_fix ?? r.description ?? null,
      expected_impact: r.expected_impact ?? r.impact ?? null,
      asset_type: r.asset_type ?? r.type ?? null,
      status: r.status,
    }))

    return NextResponse.json({
      recommendations,
      restaurant_id: audit?.restaurant_id ?? null,
    })
  }

  // Fall back to JSON blob
  const { data: audit } = await supabaseAdmin
    .from('audits')
    .select('recommendations, restaurant_id')
    .eq('id', audit_id)
    .single()

  if (audit?.recommendations) {
    return NextResponse.json({
      recommendations: JSON.parse(audit.recommendations),
      restaurant_id: audit.restaurant_id,
    })
  }

  return NextResponse.json({ recommendations: null, restaurant_id: null })
}
