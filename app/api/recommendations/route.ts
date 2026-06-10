import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { computeMetrics } from '@/lib/engine/metrics'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

  const [{ data: mentions }, { data: websiteAudit }] = await Promise.all([
    supabaseAdmin.from('mentions').select('model, prompt_id, mentioned, position, sentiment').eq('audit_id', audit_id),
    supabaseAdmin.from('website_audits').select('*').eq('audit_id', audit_id).single(),
  ])

  const metrics = computeMetrics(mentions ?? [])
  const restaurant = audit.restaurant as {
    name: string; city: string; cuisine: string | null; website: string | null
  }

  const modelBreakdown = metrics.model_breakdown
    .map(m => `${m.model}: ${Math.round(m.frequency * 100)}% (${m.mentions} mentions)`)
    .join('\n')

  const websiteSignals = websiteAudit ? `
- Schema.org markup: ${websiteAudit.schema_present ? 'Present' : 'MISSING'}
- Menu page: ${websiteAudit.menu_present ? 'Present' : 'MISSING'}
- Opening hours: ${websiteAudit.opening_hours_present ? 'Present' : 'MISSING'}
- Reservation link: ${websiteAudit.reservation_links_present ? 'Present' : 'MISSING'}
- Social media links: ${websiteAudit.social_links_present ? 'Present' : 'MISSING'}
- Meta title: ${websiteAudit.meta_title ?? 'Not found'}
- Meta description: ${websiteAudit.meta_description ?? 'Not found'}` : 'No website audit data available'

  const prompt = `You are an AI visibility consultant for restaurants. Analyse this restaurant's AI visibility audit and generate specific, actionable recommendations.

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

Generate exactly 5 specific, prioritised recommendations to improve this restaurant's AI visibility.

Format your response as a JSON array with this exact structure:
[
  {
    "priority": "high|medium|low",
    "title": "Short action title (max 8 words)",
    "what": "Exactly what to do (2-3 sentences, specific and actionable)",
    "why": "Why this will improve AI visibility (1-2 sentences)",
    "impact": "Expected impact description (e.g. '+15-25% visibility on ChatGPT')"
  }
]

Rules:
- Be SPECIFIC to this restaurant's actual data
- Prioritise by impact: fix what will move the needle most first
- Give concrete actions, not vague advice
- If a model shows 0%, explain specifically why and what to do
- Reference real platforms (Google Business Profile, TripAdvisor, etc.)
- Return ONLY the JSON array, no other text`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()
    const recommendations = JSON.parse(clean)

    await supabaseAdmin
      .from('audits')
      .update({ recommendations: JSON.stringify(recommendations) })
      .eq('id', audit_id)

    return NextResponse.json({ recommendations })
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

  const { data: audit } = await supabaseAdmin
    .from('audits')
    .select('recommendations')
    .eq('id', audit_id)
    .single()

  if (audit?.recommendations) {
    return NextResponse.json({ recommendations: JSON.parse(audit.recommendations) })
  }

  return NextResponse.json({ recommendations: null })
}
