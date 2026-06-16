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
    { data: websiteAudit },
    { data: promptRuns },
  ] = await Promise.all([
    supabaseAdmin.from('mentions').select('model, prompt_id, mentioned, mention_frequency, position, sentiment').eq('audit_id', audit_id),
    supabaseAdmin.from('visibility_scores').select('*').eq('audit_id', audit_id).single(),
    supabaseAdmin.from('competitors').select('name, mention_count').eq('audit_id', audit_id).order('mention_count', { ascending: false }).limit(3),
    supabaseAdmin.from('website_audits').select('*').eq('audit_id', audit_id).single(),
    supabaseAdmin.from('prompt_runs').select('prompt_text').eq('audit_id', audit_id).limit(6),
  ])

  const metrics = computeMetrics(mentions ?? [])
  const restaurant = audit.restaurant as {
    name: string; city: string; cuisine: string | null; website: string | null
  }

  const mentioningModels = metrics.model_breakdown.filter(m => m.mentions > 0).map(m => m.model)
  const missingModels = metrics.model_breakdown.filter(m => m.mentions === 0).map(m => m.model)
  const topCompetitors = (competitors ?? []).slice(0, 3).map(c => c.name)

  const modelLabels: Record<string, string> = {
    openai: 'ChatGPT',
    anthropic: 'Claude',
    gemini: 'Gemini',
    perplexity: 'Perplexity',
  }

  const presentModelsStr = mentioningModels.map(m => modelLabels[m] ?? m).join(', ')
  const missingModelsStr = missingModels.map(m => modelLabels[m] ?? m).join(', ')
  const competitorsStr = topCompetitors.join(', ')

  const examplePrompts = (promptRuns ?? [])
    .slice(0, 3)
    .map(p => `* "${p.prompt_text}"`)
    .join('\n')

  const websiteIssues = websiteAudit ? [
    !websiteAudit.schema_present ? 'Schema.org markup missing' : null,
    !websiteAudit.opening_hours_present ? 'Opening hours not detected' : null,
    !websiteAudit.menu_present ? 'Menu page not detected' : null,
  ].filter(Boolean) : []

  const prompt = `You are writing a cold outreach email on behalf of Finded — an AI visibility research tool for restaurants.

Write a natural, human-sounding cold email from someone who was "researching" AI visibility and noticed something about this restaurant. It should feel like a smart founder reaching out with a genuine observation, not a sales email.

RESTAURANT: ${restaurant.name}
CITY: ${restaurant.city}
CUISINE: ${restaurant.cuisine ?? 'restaurant'}

AUDIT DATA:
- Present in these AI models: ${presentModelsStr || 'none'}
- Missing from: ${missingModelsStr || 'none'}
- Top competitors that appear more often: ${competitorsStr || 'none found'}
- Mention frequency: ${Math.round(metrics.mention_frequency * 100)}% (${metrics.total_mentions} of ${metrics.total_prompts} prompts)
- Model consensus: ${metrics.model_consensus}/4 models
${websiteIssues.length > 0 ? `- Website issues: ${websiteIssues.join(', ')}` : ''}

EXAMPLE PROMPTS TESTED:
${examplePrompts}

TONE & STYLE REQUIREMENTS:
- Open with "Hi," (no name — we don't know who we're writing to)
- Frame it as: "I was researching how [city] restaurants appear in AI tools and noticed something about [restaurant]"
- List 2-3 example prompts that were tested (use the actual ones above)
- Mention which models they DO appear in (positive framing first)
- Then mention the gap — missing from certain models or recommendation flows where competitors show up
- Name 2-3 actual competitors from the data
- Say you ran a visibility audit and found several opportunities
- List 3-4 specific bullet findings (use the actual data)
- End with: "We've put together a short report showing exactly where these gaps exist and what can be done to improve them. Would you like me to send it over? No obligation—just thought you'd find the data interesting."
- Sign off: "Best,\n[Your Name]\nFinded"
- DO NOT mention prices, revenue estimates, or money
- DO NOT use words like "leverage", "game-changing", "synergy"
- Keep it under 250 words
- Sound like a human, not a marketing bot

Return ONLY a JSON object:
{
  "subject": "subject line (curious/intriguing, under 10 words, no exclamation marks)",
  "body": "full email body"
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
