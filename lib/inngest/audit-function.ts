import { inngest } from '@/lib/inngest/client'
import { supabaseAdmin } from '@/lib/supabase/client'
import { getAvailableProviders } from '@/lib/providers'
import { auditWebsite } from '@/lib/engine/website-auditor'
import { getQuickPrompts } from '@/lib/engine/prompt-generator'
import { extractEntities, findTargetInEntities } from '@/lib/engine/entity-extractor'
import { computeFullMetrics } from '@/lib/engine/metrics-v2'

const BATCH_SIZE = 5
const BATCH_DELAY = 1000

export const auditFunction = inngest.createFunction(
  {
    id: 'run-full-audit',
    name: 'Run Full AI Visibility Audit',
    retries: 2,
    timeouts: { finish: '15m' },
    triggers: [{ event: 'audit/requested' }],
  },
  async ({ event, step }: { event: { data: { audit_id: string; restaurant_id: string } }; step: any }) => {
    const { audit_id, restaurant_id } = event.data

    // ── Step 1: Load restaurant + mark running ────────────────
    const { restaurant } = await step.run(`load-restaurant-${audit_id}`, async () => {
      await supabaseAdmin
        .from('audits')
        .update({ status: 'running' })
        .eq('id', audit_id)

      const { data } = await supabaseAdmin
        .from('restaurants')
        .select('*')
        .eq('id', restaurant_id)
        .single()

      if (!data) throw new Error(`Restaurant ${restaurant_id} not found`)
      return { restaurant: data }
    })

    // ── Step 2: Website audit ─────────────────────────────────
    await step.run(`website-audit-${audit_id}`, async () => {
      const result = await auditWebsite(restaurant.website ?? '')

      const { data: existing } = await supabaseAdmin
        .from('website_audits')
        .select('id')
        .eq('audit_id', audit_id)
        .single()

      if (!existing) {
        await supabaseAdmin.from('website_audits').insert({
          audit_id,
          schema_present:            result.schema_present,
          menu_present:              result.menu_present,
          opening_hours_present:     result.opening_hours_present,
          reservation_links_present: result.reservation_links_present,
          social_links_present:      result.social_links_present,
          review_count:              result.review_count,
          meta_title:                result.meta_title,
          meta_description:          result.meta_description,
          raw_html_snippet:          result.raw_html_snippet,
        })
      }
    })

    // ── Step 3: Generate prompts ──────────────────────────────
    const { prompts } = await step.run(`generate-prompts-${audit_id}`, async () => {
      const generated = getQuickPrompts(
        restaurant.name,
        restaurant.category ?? restaurant.cuisine ?? 'restaurant',
        restaurant.city,
        restaurant.country ?? 'Netherlands',
        restaurant.cuisine ?? undefined
      )

      await supabaseAdmin.from('prompt_runs').insert(
        generated.map((p: { id: string; category: string; intent: string; prompt: string }) => ({
          audit_id,
          prompt_id:   p.id,
          category:    p.category,
          intent:      p.intent,
          prompt_text: p.prompt,
        }))
      )

      return { prompts: generated }
    })

    // ── Step 4: Run AI models in batches ──────────────────────
    const providers = getAvailableProviders()
    const allModelRuns: Array<{
      model: string
      prompt_id: string
      response: string
      error?: string
    }> = []

    const batches: any[][] = []
    for (let i = 0; i < prompts.length; i += BATCH_SIZE) {
      batches.push(prompts.slice(i, i + BATCH_SIZE))
    }

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx]

      const batchResults = await step.run(`run-prompts-batch-${audit_id}-${batchIdx}`, async () => {
        const results: Array<{ model: string; prompt_id: string; response: string; error?: string }> = []

        await Promise.all(
          providers.map(async (provider: any) => {
            for (const promptObj of batch) {
              await new Promise(r => setTimeout(r, 200))
              const result = await provider.runPrompt(promptObj.prompt)

              await supabaseAdmin.from('model_runs').insert({
                audit_id,
                model:        provider.name,
                prompt_id:    promptObj.id,
                raw_response: result.error ? `ERROR: ${result.error}` : result.response,
                tokens_used:  result.tokens_used ?? null,
                duration_ms:  result.duration_ms,
              })

              results.push({
                model:     provider.name,
                prompt_id: promptObj.id,
                response:  result.error ? '' : result.response,
                error:     result.error,
              })
            }
          })
        )

        return results
      })

      allModelRuns.push(...batchResults)

      if (batchIdx < batches.length - 1) {
        await step.sleep(`batch-delay-${audit_id}-${batchIdx}`, BATCH_DELAY)
      }
    }

    // ── Step 5: Extract entities + insert mentions ────────────
    const allEntities: Array<{
      name: string
      position: number
      sentiment: string
      reasons: string[]
      model: string
      prompt_id: string
    }> = []

    const successfulRuns = allModelRuns.filter(r => r.response && !r.error)

    const extractionBatches: typeof successfulRuns[] = []
    for (let i = 0; i < successfulRuns.length; i += 10) {
      extractionBatches.push(successfulRuns.slice(i, i + 10))
    }

    for (let batchIdx = 0; batchIdx < extractionBatches.length; batchIdx++) {
      const batch = extractionBatches[batchIdx]

      const extractedBatch = await step.run(`extract-entities-batch-${audit_id}-${batchIdx}`, async () => {
        const results: Array<{ name: string; position: number; sentiment: string; reasons: string[]; model: string; prompt_id: string }> = []

        for (const run of batch) {
          const prompt = prompts.find((p: { id: string }) => p.id === run.prompt_id)
          if (!prompt) continue

          const extraction = await extractEntities(run.response, prompt.prompt, run.model)

          for (const entity of extraction.entities) {
            await supabaseAdmin.from('entities').insert({
              audit_id,
              model:      run.model,
              prompt_id:  run.prompt_id,
              name:       entity.name,
              type:       entity.type,
              position:   entity.position,
              context:    entity.context,
              sentiment:  entity.sentiment,
              confidence: entity.confidence,
            })

            if (entity.reasons.length > 0) {
              const { data: entityRow } = await supabaseAdmin
                .from('entities')
                .select('id')
                .eq('audit_id', audit_id)
                .eq('model', run.model)
                .eq('prompt_id', run.prompt_id)
                .eq('name', entity.name)
                .single()

              if (entityRow) {
                await supabaseAdmin.from('recommendation_reasons').insert(
                  entity.reasons.map((reason: string) => ({
                    entity_id: entityRow.id,
                    audit_id,
                    reason,
                  }))
                )
              }
            }

            results.push({
              name:      entity.name,
              position:  entity.position,
              sentiment: entity.sentiment,
              reasons:   entity.reasons,
              model:     run.model,
              prompt_id: run.prompt_id,
            })
          }

          const targetEntity = findTargetInEntities(restaurant.name, extraction.entities)
          await supabaseAdmin.from('mentions').insert({
            audit_id,
            model:           run.model,
            prompt_id:       run.prompt_id,
            restaurant_name: restaurant.name,
            mentioned:       targetEntity !== null,
            position:        targetEntity?.position ?? null,
            sentiment:       targetEntity?.sentiment ?? null,
          })
        }

        return results
      })

      allEntities.push(...extractedBatch)
    }

    // ── Step 6: Compute scores ────────────────────────────────
    await step.run(`compute-scores-${audit_id}`, async () => {
      const { data: entities } = await supabaseAdmin
        .from('entities')
        .select('*')
        .eq('audit_id', audit_id)

      const { data: mentions } = await supabaseAdmin
        .from('mentions')
        .select('*')
        .eq('audit_id', audit_id)

      if (!entities || !mentions || mentions.length === 0) return

      const mentionData = mentions.map((m: any) => ({
        model:     m.model as any,
        prompt_id: m.prompt_id,
        mentioned: m.mentioned,
        position:  m.position,
        sentiment: m.sentiment,
      }))

      const entityData = entities.map((e: any) => ({
        name:      e.name,
        position:  e.position ?? 0,
        sentiment: e.sentiment ?? 'neutral',
        reasons:   [],
        model:     e.model,
        prompt_id: e.prompt_id,
      }))

      const metrics = computeFullMetrics(restaurant.name, mentionData, entityData)

      await supabaseAdmin.from('visibility_scores').insert({
        audit_id,
        restaurant_id,
        visibility_score:          metrics.visibility_score,
        opportunity_score:         metrics.opportunity_score,
        opportunity_label:         metrics.opportunity_label,
        mention_frequency:         metrics.mention_frequency,
        prompt_coverage:           metrics.prompt_coverage,
        avg_position:              metrics.avg_position,
        median_position:           metrics.median_position,
        best_position:             metrics.best_position,
        worst_position:            metrics.worst_position,
        position_score:            metrics.position_score,
        model_consensus:           metrics.model_consensus,
        share_of_voice:            metrics.share_of_voice,
        total_market_mentions:     metrics.total_market_mentions,
        sentiment_score:           metrics.sentiment_score,
        sentiment_positive:        metrics.sentiment_breakdown.positive,
        sentiment_neutral:         metrics.sentiment_breakdown.neutral,
        sentiment_negative:        metrics.sentiment_breakdown.negative,
        visibility_gap:            metrics.visibility_gap,
        recommendation_gap:        metrics.recommendation_gap,
        estimated_visitors_min:    metrics.estimated_additional_visitors_min,
        estimated_visitors_max:    metrics.estimated_additional_visitors_max,
        estimated_revenue_min:     metrics.estimated_revenue_min,
        estimated_revenue_max:     metrics.estimated_revenue_max,
        total_mentions:            metrics.total_mentions,
        total_prompts:             metrics.total_prompts,
        total_model_runs:          metrics.total_model_runs,
      })

      if (metrics.competitors.length > 0) {
        await supabaseAdmin.from('competitors').insert(
          metrics.competitors.map((c: any) => ({
            audit_id,
            name:            c.name,
            mention_count:   c.mention_count,
            avg_position:    c.avg_position,
            sentiment_score: c.sentiment_score,
            share_of_voice:  c.share_of_voice,
            top_reasons:     c.top_reasons,
          }))
        )
      }

      await supabaseAdmin
        .from('audits')
        .update({ total_prompts: metrics.total_prompts, total_model_runs: metrics.total_model_runs })
        .eq('id', audit_id)
    })

    // ── Step 6c: Save score history ───────────────────────────
    await step.run(`save-score-history-${audit_id}`, async () => {
      const { data: vs } = await supabaseAdmin
        .from('visibility_scores')
        .select('*')
        .eq('audit_id', audit_id)
        .single()

      if (!vs) return

      await supabaseAdmin.from('score_history').insert({
        restaurant_id,
        audit_id,
        visibility_score:   vs.visibility_score,
        opportunity_score:  vs.opportunity_score,
        mention_frequency:  vs.mention_frequency,
        model_consensus:    vs.model_consensus,
        total_mentions:     vs.total_mentions,
        snapshot_date:      new Date().toISOString(),
      })
    })

    // ── Step 7: Complete ──────────────────────────────────────
    await step.run(`complete-${audit_id}`, async () => {
      await supabaseAdmin
        .from('audits')
        .update({
          status:       'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', audit_id)

      await supabaseAdmin
        .from('audit_queue')
        .delete()
        .eq('audit_id', audit_id)
    })

    return { success: true, audit_id }
  }
)
