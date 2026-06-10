import { supabaseAdmin } from '@/lib/supabase/client'
import { getAvailableProviders } from '@/lib/providers'
import { extractMention } from './mention-extractor'
import { getPromptsForCity, getCuisinePrompts } from './prompt-engine'
import { auditWebsite } from './website-auditor'
import { Restaurant } from '@/types/database'

const RATE_LIMIT_DELAY_MS = 200

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function runAudit(auditId: string): Promise<void> {
  await supabaseAdmin
    .from('audits')
    .update({ status: 'running' })
    .eq('id', auditId)

  try {
    const { data: audit, error: auditError } = await supabaseAdmin
      .from('audits')
      .select('*, restaurant:restaurants(*)')
      .eq('id', auditId)
      .single()

    if (auditError || !audit) {
      throw new Error(`Audit ${auditId} not found`)
    }

    const restaurant = audit.restaurant as Restaurant

    // 1. Website audit
    const websiteResult = await auditWebsite(restaurant.website ?? '')

    await supabaseAdmin.from('website_audits').insert({
      audit_id:                  auditId,
      schema_present:            websiteResult.schema_present,
      menu_present:              websiteResult.menu_present,
      opening_hours_present:     websiteResult.opening_hours_present,
      reservation_links_present: websiteResult.reservation_links_present,
      social_links_present:      websiteResult.social_links_present,
      review_count:              websiteResult.review_count,
      meta_title:                websiteResult.meta_title,
      meta_description:          websiteResult.meta_description,
      raw_html_snippet:          websiteResult.raw_html_snippet,
    })

    // 2. Build prompt set
    const cityPrompts = await getPromptsForCity(restaurant.city)
    const cuisinePrompts = restaurant.cuisine
      ? getCuisinePrompts(restaurant.city, restaurant.cuisine)
      : []

    const seen = new Set<string>()
    const allPrompts = [...cityPrompts, ...cuisinePrompts].filter((p) => {
      if (seen.has(p.prompt)) return false
      seen.add(p.prompt)
      return true
    }).slice(0, 5)

    // 3. Run all providers in parallel
    const providers = getAvailableProviders()

    if (providers.length === 0) {
      throw new Error('No AI providers configured — check API keys')
    }

    async function runProvider(provider: ReturnType<typeof getAvailableProviders>[number]) {
      for (const promptObj of allPrompts) {
        await sleep(RATE_LIMIT_DELAY_MS)

        const result = await provider.runPrompt(promptObj.prompt)

        if (result.error) {
          await supabaseAdmin.from('model_runs').insert({
            audit_id:     auditId,
            model:        provider.name,
            prompt_id:    promptObj.id,
            raw_response: `ERROR: ${result.error}`,
            tokens_used:  null,
            duration_ms:  result.duration_ms,
          })
          continue
        }

        await supabaseAdmin.from('model_runs').insert({
          audit_id:     auditId,
          model:        provider.name,
          prompt_id:    promptObj.id,
          raw_response: result.response,
          tokens_used:  result.tokens_used ?? null,
          duration_ms:  result.duration_ms,
        })

        const mention = extractMention(restaurant.name, result.response)

        await supabaseAdmin.from('mentions').insert({
          audit_id:        auditId,
          model:           provider.name,
          prompt_id:       promptObj.id,
          restaurant_name: restaurant.name,
          mentioned:       mention.mentioned,
          position:        mention.position,
          sentiment:       mention.sentiment,
        })
      }
    }

    await Promise.all(providers.map(runProvider))

    // 4. Complete
    await supabaseAdmin
      .from('audits')
      .update({
        status:       'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', auditId)

    await supabaseAdmin
      .from('audit_queue')
      .delete()
      .eq('audit_id', auditId)

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[audit ${auditId}] FAILED:`, message)

    await supabaseAdmin
      .from('audits')
      .update({
        status:        'failed',
        error_message: message,
        completed_at:  new Date().toISOString(),
      })
      .eq('id', auditId)

    await supabaseAdmin
      .from('audit_queue')
      .update({ locked_at: null, locked_by: null })
      .eq('audit_id', auditId)
  }
}

export async function createAudit(restaurantId: string): Promise<string> {
  const { data: audit, error } = await supabaseAdmin
    .from('audits')
    .insert({ restaurant_id: restaurantId, status: 'queued' })
    .select('id')
    .single()

  if (error || !audit) throw new Error(`Failed to create audit: ${error?.message}`)

  await supabaseAdmin.from('audit_queue').insert({ audit_id: audit.id })

  return audit.id
}
