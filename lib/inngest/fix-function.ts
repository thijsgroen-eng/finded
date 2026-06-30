import { inngest } from '@/lib/inngest/client'
import { supabaseAdmin } from '@/lib/supabase/client'
import Anthropic from '@anthropic-ai/sdk'
import { sanitizeJsonLd } from '@/lib/engine/jsonld'

if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set')
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Appended to every fix's system prompt: any JSON-LD must be syntactically valid.
const VALID_JSONLD_RULE = `

JSON-LD VALIDITY: any <script type="application/ld+json"> you emit MUST be valid JSON — NO comments (no // and no /* */), no trailing commas. Express "to be filled in" guidance as placeholder STRING VALUES (e.g. "telephone": "[PLACEHOLDER: phone number]"), never as comments.`

// Appended to every fix's system prompt. These assets are about REAL businesses,
// so the model must never invent verifiable facts (founding dates, awards,
// chef names, review counts, prices, quotes, addresses). Anything the business
// must supply is emitted as an explicit [PLACEHOLDER: ...] marker for the owner
// to fill in.
const NO_FABRICATION_RULE = `

CRITICAL — DO NOT FABRICATE FACTS:
- This content is for a real business. Never invent specific facts: founding year/story, awards, recognition, press mentions, chef or staff names, prices, ratings, review counts, addresses, phone numbers, opening hours, or quotes.
- For any factual claim the business must provide, output an explicit placeholder like [PLACEHOLDER: founding year] or [PLACEHOLDER: head chef name] instead of guessing.
- Only state things that are clearly supported by the input provided. When unsure, use a placeholder rather than a plausible-sounding invention.`

const FIX_CONFIGS: Record<string, {
  title: string
  format: string
  systemPrompt: string
  buildPrompt: (restaurant: any, websiteAudit: any, auditData: any) => string
}> = {
  schema_jsonld: {
    title: 'Restaurant Schema Markup',
    format: 'json-ld',
    systemPrompt: 'You are a structured data expert. Generate valid JSON-LD schema markup for restaurants. Return ONLY the JSON-LD script tag, nothing else.',
    buildPrompt: (r, wa) => `Generate a complete Restaurant JSON-LD schema for:

Name: ${r.name}
City: ${r.city}
Website: ${r.website ?? 'unknown'}
Cuisine: ${r.cuisine ?? 'restaurant'}
${wa?.meta_description ? `Description: ${wa.meta_description}` : ''}
${wa?.meta_title ? `Title: ${wa.meta_title}` : ''}

Include: name, url, cuisine, address (use city), telephone placeholder, servesCuisine, priceRange placeholder.
Return ONLY a <script type="application/ld+json"> block.`,
  },

  faq_page: {
    title: 'FAQ Page Content',
    format: 'html',
    systemPrompt: 'You are a content strategist specializing in AI-optimized restaurant content. Generate FAQ content that directly answers questions AI models use when recommending restaurants. Return ONLY valid HTML.',
    buildPrompt: (r) => `Generate a complete FAQ page for ${r.name}, a ${r.cuisine ?? 'restaurant'} in ${r.city}.

Create 12 Q&A pairs covering:
- Reservations and booking
- Menu and dietary options  
- Location and parking
- Ambiance and dress code
- Group dining and events
- Opening hours format
- What makes them special
- Price range expectations

Write answers as if a knowledgeable staff member is responding. Be specific and factual.
Include JSON-LD FAQPage schema at the end.
Return complete HTML with <h1>, <div class="faq-item">, <h3> questions, <p> answers, and the JSON-LD script.`,
  },

  optimized_description: {
    title: 'AI-Optimized Description',
    format: 'html',
    systemPrompt: 'You are an expert in AI search optimization for restaurants. Write descriptions that AI models extract and cite. Return ONLY HTML content blocks.',
    buildPrompt: (r, wa) => `Write an AI-optimized description for ${r.name}, a ${r.cuisine ?? 'restaurant'} in ${r.city}.

Current meta description: ${wa?.meta_description ?? 'none'}

Generate:
1. A 160-character meta description (SEO + AI optimized)
2. A 200-word homepage intro paragraph (entity-rich, specific, citable)
3. A 100-word "About" summary with key facts AI models look for

Focus on: specific cuisine style, atmosphere keywords, notable features, location context, what makes it recommendable.
Return as HTML with clear section headings.`,
  },

  opening_hours: {
    title: 'Opening Hours Schema',
    format: 'json-ld',
    systemPrompt: 'You are a structured data expert. Generate opening hours schema markup. Return ONLY the JSON-LD.',
    buildPrompt: (r) => `Generate opening hours JSON-LD schema for ${r.name} in ${r.city}.

Since actual hours are unknown, generate a realistic template for a ${r.cuisine ?? 'restaurant'} with:
- Standard restaurant hours format (Mon-Sun) using openingHoursSpecification
- Use placeholder STRING VALUES like "[PLACEHOLDER: Mon open time]" for times to confirm — never invent real hours

Return a single <script type="application/ld+json"> block. The JSON-LD MUST be valid JSON: NO comments (no // or /* */), no trailing commas. Put any "fill this in" guidance inside placeholder string values, not comments.`,
  },

  authority_content: {
    title: 'Authority Page Content',
    format: 'html',
    systemPrompt: 'You are a content writer specializing in restaurant authority content that AI models cite. Return ONLY HTML content.',
    buildPrompt: (r, wa) => `Write an authority-building "About Us" page for ${r.name}, a ${r.cuisine ?? 'restaurant'} in ${r.city}.

Current description: ${wa?.meta_description ?? 'none'}

Create a 600-word page that includes:
- Founding story — use [PLACEHOLDER: founding year] and [PLACEHOLDER: founding story] markers; do NOT invent dates or events
- Chef/team background — use [PLACEHOLDER: chef name] / [PLACEHOLDER: team background] markers
- Philosophy and sourcing approach (general, non-fabricated language is fine here)
- What makes them a top choice in ${r.city} (frame as positioning, not invented facts)
- Awards or recognition — only as [PLACEHOLDER: awards / recognition]; never invent awards
- Community involvement — use [PLACEHOLDER: community involvement]

Structure it so the owner can fill placeholders and AI models can then cite real facts.
Return complete HTML with proper heading structure.`,
  },

  menu_structure: {
    title: 'Structured Menu Markup',
    format: 'html',
    systemPrompt: 'You are a structured data expert for restaurants. Generate semantic HTML menus with schema markup. Return ONLY HTML.',
    buildPrompt: (r) => `Generate a structured menu template for ${r.name}, a ${r.cuisine ?? 'restaurant'} in ${r.city}.

Create a complete menu HTML structure with:
- JSON-LD Menu schema with MenuSection and MenuItem
- Semantic HTML with clear section headers
- 3-4 realistic menu sections for ${r.cuisine ?? 'a restaurant'} cuisine
- 4-5 placeholder items per section with description format
- Price placeholders (€XX)
- Dietary labels markup (vegetarian, vegan, gluten-free)

Include a note at the top: "Replace placeholder items with actual menu items"
Return complete HTML ready to embed.`,
  },

  reservation_markup: {
    title: 'Reservation Link Markup',
    format: 'html',
    systemPrompt: 'You are a structured data expert. Generate reservation schema and CTA markup. Return ONLY HTML.',
    buildPrompt: (r) => `Generate reservation markup for ${r.name} in ${r.city}.

Create:
1. JSON-LD with hasMap and acceptsReservations: true
2. A reservation CTA HTML block (button + text)
3. A brief "How to reserve" section

Include placeholders for:
- Reservation URL (TheFork, OpenTable, or direct)
- Phone number
- Email for group bookings

Return complete HTML + JSON-LD, ready to add to the website.`,
  },

  location_page: {
    title: 'Location Landing Page',
    format: 'html',
    systemPrompt: 'You are an SEO and AI visibility expert. Generate location-optimized landing pages for restaurants. Return ONLY HTML.',
    buildPrompt: (r) => `Generate a location landing page for ${r.name} in ${r.city}.

Create a full page targeting people searching for ${r.cuisine ?? 'restaurants'} in ${r.city} and nearby neighborhoods.

Include:
- H1 targeting "[Cuisine] restaurant [City]"  
- 300-word intro with location context
- Neighborhood context paragraph
- "Why visit" section with 4 bullet points
- Getting there section (public transport template)
- Local area description
- JSON-LD LocalBusiness schema with geo coordinates placeholder

Write for both AI models and search engines. Be specific about the city and neighborhood context.
Return complete HTML page structure.`,
  },
}

export const fixFunction = inngest.createFunction(
  {
    id: 'generate-fix',
    name: 'Generate Fix Asset',
    retries: 2,
    timeouts: { finish: '5m' },
    triggers: [{ event: 'fix/requested' }],
  },
  async ({ event, step }) => {
    const { recommendation_id, restaurant_id, audit_id, fix_type } = event.data

    // Load data
    const { restaurant, websiteAudit } = await step.run(`load-data-${recommendation_id}`, async () => {
      const { data: restaurant } = await supabaseAdmin
        .from('restaurants')
        .select('*')
        .eq('id', restaurant_id)
        .single()

      const { data: websiteAudit } = await supabaseAdmin
        .from('website_audits')
        .select('*')
        .eq('audit_id', audit_id)
        .single()

      return { restaurant, websiteAudit }
    })

    if (!restaurant) {
      await supabaseAdmin
        .from('recommendations')
        .update({ status: 'failed' })
        .eq('id', recommendation_id)
      return { error: 'Restaurant not found' }
    }

    const config = FIX_CONFIGS[fix_type]
    if (!config) {
      await supabaseAdmin
        .from('recommendations')
        .update({ status: 'failed' })
        .eq('id', recommendation_id)
      return { error: `Unknown fix type: ${fix_type}` }
    }

    // Generate the asset
    const content = await step.run(`generate-${recommendation_id}`, async () => {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: config.systemPrompt + NO_FABRICATION_RULE + VALID_JSONLD_RULE,
        messages: [{
          role: 'user',
          content: config.buildPrompt(restaurant, websiteAudit, null),
        }],
      })

      const raw = message.content[0]?.type === 'text' ? message.content[0].text : ''
      // Strip any code fences, then normalize JSON-LD blocks to valid JSON.
      const unfenced = raw.replace(/```(?:json|html|json-ld)?\n?|```/g, '').trim()
      return sanitizeJsonLd(unfenced)
    })

    // Get current version count
    const { count } = await supabaseAdmin
      .from('generated_assets')
      .select('id', { count: 'exact', head: true })
      .eq('recommendation_id', recommendation_id)

    // Store the asset
    await step.run(`store-${recommendation_id}`, async () => {
      await supabaseAdmin.from('generated_assets').insert({
        restaurant_id,
        recommendation_id,
        audit_id,
        type: fix_type,
        title: config.title,
        content,
        format: config.format,
        status: 'draft',
        version: (count ?? 0) + 1,
      })

      await supabaseAdmin
        .from('recommendations')
        .update({ status: 'generated' })
        .eq('id', recommendation_id)
    })

    return { success: true, fix_type, recommendation_id }
  }
)
