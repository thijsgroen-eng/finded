import { NextRequest, NextResponse } from 'next/server'
import { isValidSession, readSession, ADMIN_COOKIE } from '@/lib/auth/admin'
import { supabaseAdmin } from '@/lib/supabase/client'
import { cookies } from 'next/headers'
import { ALL_PROMPTS, MARKETPLACE_PACKS } from '@/lib/marketplace/catalog'
import Anthropic from '@anthropic-ai/sdk'

async function auth() {
  const jar = await cookies()
  const token = jar.get(ADMIN_COOKIE)?.value
  if (!token || !(await isValidSession(token))) return null
  return readSession(token)
}

// POST /api/admin/prompts/marketplace
// actions: 'import' | 'import_pack' | 'optimize'
export async function POST(req: NextRequest) {
  const user = await auth()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { action } = body

  // ── Import a single prompt ─────────────────────────────────────────────────
  if (action === 'import') {
    const { promptId, business_type = 'restaurant', language, category, template, title } = body
    if (!promptId || !language || !category || !template) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Use provided template (allows rename/edit before import)
    const { data, error } = await supabaseAdmin
      .from('prompt_templates')
      .insert({
        business_type,
        language,
        category,
        template,
        sort_order: 99,
        enabled: true,
        status: 'draft',
        version: 1,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Audit log
    await supabaseAdmin.from('admin_audit_log').insert({
      user_id: null,
      email: user.email ?? 'admin',
      action: 'marketplace.import',
      target: `${promptId} → ${data.id}`,
      data: null,
    })

    return NextResponse.json({ id: data.id, message: `Imported "${title}" as draft` })
  }

  // ── Import an entire pack ──────────────────────────────────────────────────
  if (action === 'import_pack') {
    const { packId, business_type = 'restaurant' } = body
    const pack = MARKETPLACE_PACKS.find(p => p.id === packId)
    if (!pack) return NextResponse.json({ error: 'Pack not found' }, { status: 404 })

    const rows = pack.prompts.map(p => ({
      business_type,
      language: p.language,
      category: p.category,
      template: p.template,
      sort_order: 99,
      enabled: true,
      status: 'draft' as const,
      version: 1,
    }))

    const { data, error } = await supabaseAdmin.from('prompt_templates').insert(rows).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabaseAdmin.from('admin_audit_log').insert({
      user_id: null,
      email: user.email ?? 'admin',
      action: 'marketplace.import_pack',
      target: packId,
      data: null,
    })

    return NextResponse.json({ count: data.length, message: `Imported ${data.length} prompts from "${pack.name}" as drafts` })
  }

  // ── AI optimize a prompt ───────────────────────────────────────────────────
  if (action === 'optimize') {
    const { template, goal = 'clarity' } = body
    if (!template) return NextResponse.json({ error: 'Missing template' }, { status: 400 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 503 })

    const goalInstructions: Record<string, string> = {
      clarity: 'Make the prompt clearer and more specific. Remove ambiguity. Keep it concise.',
      tokens: 'Reduce the number of words while preserving meaning. Aim to cut at least 20% of tokens.',
      structured: 'Rewrite the prompt to request structured, list-based output that is easy for AI to parse.',
      reasoning: 'Add chain-of-thought instructions that encourage the AI to reason step by step.',
    }

    const instruction = goalInstructions[goal] ?? goalInstructions.clarity

    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `You are an expert prompt engineer. ${instruction}

Placeholders {location}, {businessType}, {subtype} must be preserved exactly as-is.
Return ONLY the improved prompt text — no explanation, no quotes, no preamble.

Original prompt:
${template}`,
        },
      ],
    })

    const optimized = (message.content[0] as { type: string; text: string }).text.trim()
    return NextResponse.json({ optimized })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

// GET /api/admin/prompts/marketplace?search=&category=&lang=
export async function GET(req: NextRequest) {
  const user = await auth()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const search = (searchParams.get('search') ?? '').toLowerCase()
  const category = searchParams.get('category') ?? ''
  const lang = searchParams.get('lang') ?? ''

  let prompts = ALL_PROMPTS

  if (search) {
    prompts = prompts.filter(p =>
      p.title.toLowerCase().includes(search) ||
      p.description.toLowerCase().includes(search) ||
      p.template.toLowerCase().includes(search) ||
      p.tags.some(t => t.includes(search)) ||
      p.packName.toLowerCase().includes(search)
    )
  }
  if (category) prompts = prompts.filter(p => p.category === category)
  if (lang) prompts = prompts.filter(p => p.language === lang)

  return NextResponse.json({ prompts, packs: MARKETPLACE_PACKS })
}
