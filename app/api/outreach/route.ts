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

  const [
    { data: mentions },
    { data: visibilityScore },
    { data: competitors },
  ] = await Promise.all([
    supabaseAdmin.from('mentions').select('model, prompt_id, mentioned, position, sentiment').eq('audit_id', audit_id),
    supabaseAdmin.from('visibility_scores').select('*').eq('audit_id', audit_id).single(),
    supabaseAdmin.from('competitors').select('name, mention_count').eq('audit_id', audit_id).order('mention_count', { ascending: false }).limit(3),
  ])

  const metrics = computeMetrics(mentions ?? [])
  const restaurant = audit.restaurant as {
    name: string; city: string; cuisine: string | null; website: string | null
  }

  const topCompetitor = competitors?.[0]
  const myMentions = metrics.total_mentions
  const opportunityScore = visibilityScore?.opportunity_score ?? null
  const opportunityLabel = visibilityScore?.opportunity_label ?? null
  const revenueMin = visibilityScore?.estimated_revenue_min ?? null
  const revenueMax = visibilityScore?.estimated_revenue_max ?? null
  const missingModels = metrics.model_breakdown
    .filter(m => m.mentions === 0)
    .map(m => m.model)

  const prompt = `You are writing a cold outreach email on behalf of Finded — an AI visibility platform for restaurants.

Write a short, compelling cold email to the owner/manager of ${restaurant.name} in ${restaurant.city}.

AUDIT FINDINGS TO USE:
- Mention frequency: ${Math.round(metrics.mention_frequency * 100)}% (mentioned in ${myMentions} of ${metrics.total_prompts} AI prompts)
- Model consensus: ${metrics.model_consensus}/4 AI models mention this restaurant
${missingModels.length > 0 ? `- NOT mentioned by: ${missingModels.join(', ')}` : ''}
${topCompetitor ? `- Top competitor "${topCompetitor.name}" is mentioned ${topCompetitor.mention_count}× vs their ${myMentions}×` : ''}
${opportunityScore !== null ? `- AI opportunity score: ${Math.round(opportunityScore)}/100 (${opportunityLabel})` : ''}
${revenueMin !== null && revenueMax !== null && revenueMax > 0 ? `- Estimated revenue opportunity: €${revenueMin.toLocaleString()}–€${revenueMax.toLocaleString()}/month` : ''}

EMAIL REQUIREMENTS:
- Subject line: intriguing, specific, under 10 words
- Body: 4-5 short paragraphs, conversational Dutch-friendly English
- Open with a specific insight about their AI visibility (not generic)
- Mention the competitor gap if available
- Include the revenue opportunity if available
- End with a simple, low-friction CTA (e.g. "Would you be open to a quick 15-minute call?")
- Do NOT use buzzwords like "leverage", "synergy", "game-changing"
- Sound like a smart founder reaching out, not a sales robot
- Keep total body under 200 words

Return ONLY a JSON object with this structure:
{
  "subject": "email subject line",
  "body": "full email body text"
}`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()
    const email = JSON.parse(clean)

    return NextResponse.json({ email })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate email' },
      { status: 500 }
    )
  }
}
