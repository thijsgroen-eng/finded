import { inngest } from '@/lib/inngest/client'
import { supabaseAdmin } from '@/lib/supabase/client'
import { getAvailableProviders } from '@/lib/providers'
import { auditWebsite } from '@/lib/engine/website-auditor'
import { getQuickPrompts } from '@/lib/engine/prompt-generator'
import { extractEntities, findTargetInEntities, keywordTargetMention } from '@/lib/engine/entity-extractor'
import { computeFullMetrics } from '@/lib/engine/metrics-v2'

const BATCH_SIZE = 5
const BATCH_DELAY = 1000

// Each prompt is sampled AUDIT_SAMPLES times at AUDIT_TEMPERATURE so a mention
// becomes a frequency (e.g. seen in 2/3 runs = 0.67) instead of a single noisy
// boolean. Grounding is on by default per provider that supports it.
const AUDIT_SAMPLES = Math.max(1, Number(process.env.AUDIT_SAMPLES ?? 3))
const AUDIT_TEMPERATURE = Number(process.env.AUDIT_TEMPERATURE ?? 0.2)
const AUDIT_GROUNDED = (process.env.AUDIT_GROUNDED ?? 'true') !== 'false'

function majoritySentiment(values: string[]): string | null {
  if (values.length === 0) return null
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

function average(nums: number[]): number | null {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
}

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

    // ── Step 1: Load entity + mark running ───────────────────
    const { entity } = await step.run(`load-entity-${audit_id}`, async () => {
      await supabaseAdmin
        .from('audits')
        .update({ status: 'running' })
        .eq('id', audit_id)

      const { data } = await supabaseAdmin
        .from('restaurants')
        .select('*')
        .eq('id', restaurant_id)
        .single()

      if (!data) throw new Error(`Entity ${restaurant_id} not found`)
      return { entity: data }
    })

    // ── Step 2: Website audit ─────────────────────────────────
    await step.run(`website-audit-${audit_id}`, async () => {
      const result = await auditWebsite(entity.website ?? '')

      const { data: existing } = await supabaseAdmin
        .from('website_audits')
        .select('id')
        .eq('audit_id', audit_id)
        .single()

      if (!existing) {
        await supabaseAdmin.from('website_audits').insert({
          audit_id,
          // Legacy restaurant columns (kept for backward compat)
          schema_present:            result.schema_present,
          menu_present:              result.menu_or_services_present,
          opening_hours_present:     result.hours_present,
          reservation_links_present: result.booking_present,
          social_links_present:      result.social_links_present,
          review_count:              result.review_count,
          meta_title:                result.meta_title,
          meta_description:          result.meta_description,
          raw_html_snippet:          result.raw_html_snippet,
          // Universal columns
          schema_types:              result.schema_types,
          contact_present:           result.contact_present,
          location_present:          result.location_present,
          review_signals:            result.review_signals,
          booking_present:           result.booking_present,
          faq_present:               result.faq_present,
          menu_or_services_present:  result.menu_or_services_present,
        })
      }
    })

    // ── Step 3: Generate prompts ──────────────────────────────
    const { prompts } = await step.run(`generate-prompts-${audit_id}`, async () => {
      // Use business_type if available, fall back to cuisine/category, then 'restaurant'
      const businessType = entity.business_type ?? 'restaurant'
      const subtypes: string[] = entity.subtypes
        ?? (entity.cuisine ? [entity.cuisine] : [businessType])

      const generated = getQuickPrompts(
        entity.name,
        businessType,
        entity.city,
        entity.country ?? 'Netherlands',
        subtypes[0],
        subtypes,
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

    // ── Step 4: Run AI models in batches (N samples per prompt) ───
    const providers = getAvailableProviders()
    // One entry per (model, prompt) holding the successful sample responses.
    const allRuns: Array<{ model: string; prompt_id: string; responses: string[]; samples: number }> = []

    const batches: typeof prompts[] = []
    for (let i = 0; i < prompts.length; i += BATCH_SIZE) {
      batches.push(prompts.slice(i, i + BATCH_SIZE))
    }

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx]

      const batchResults = await step.run(`run-prompts-batch-${audit_id}-${batchIdx}`, async () => {
        const results: Array<{ model: string; prompt_id: string; responses: string[]; samples: number }> = []

        await Promise.all(
          providers.map(async (provider: any) => {
            for (const promptObj of batch) {
              const responses: string[] = []
              for (let sample = 0; sample < AUDIT_SAMPLES; sample++) {
                await new Promise(r => setTimeout(r, 200))
                const result = await provider.runPrompt(promptObj.prompt, {
                  temperature: AUDIT_TEMPERATURE,
                  grounded: AUDIT_GROUNDED && provider.supportsGrounding,
                })

                await supabaseAdmin.from('model_runs').insert({
                  audit_id,
                  model:          provider.name,
                  prompt_id:      promptObj.id,   // generator's text id (no longer a prompts FK)
                  prompt_text_id: promptObj.id,
                  sample_index:   sample,
                  grounded:       result.grounded ?? null,
                  raw_response:   result.error ? `ERROR: ${result.error}` : result.response,
                  tokens_used:    result.tokens_used ?? null,
                  duration_ms:    result.duration_ms,
                })

                if (!result.error && result.response) responses.push(result.response)
              }

              results.push({ model: provider.name, prompt_id: promptObj.id, responses, samples: AUDIT_SAMPLES })
            }
          })
        )

        return results
      })

      allRuns.push(...batchResults)

      if (batchIdx < batches.length - 1) {
        await step.sleep(`batch-delay-${audit_id}-${batchIdx}`, BATCH_DELAY)
      }
    }

    // ── Step 5: Extract entities (per sample) + aggregate ─────
    // For each (model, prompt) we extract entities from every sampled response,
    // then aggregate: the target's mention becomes a frequency across samples,
    // and competitor entities are deduped (one row per name) with averaged
    // position/sentiment. This collapses N noisy samples into one stable signal.
    const allEntities: Array<{
      name: string
      position: number
      sentiment: string
      reasons: string[]
      model: string
      prompt_id: string
    }> = []

    const runsWithResponses = allRuns.filter(r => r.responses.length > 0)

    const extractionBatches: typeof runsWithResponses[] = []
    for (let i = 0; i < runsWithResponses.length; i += 10) {
      extractionBatches.push(runsWithResponses.slice(i, i + 10))
    }

    for (let batchIdx = 0; batchIdx < extractionBatches.length; batchIdx++) {
      const batch = extractionBatches[batchIdx]

      const extractedBatch = await step.run(`extract-entities-batch-${audit_id}-${batchIdx}`, async () => {
        const results: Array<{ name: string; position: number; sentiment: string; reasons: string[]; model: string; prompt_id: string }> = []

        for (const run of batch) {
          const prompt = prompts.find((p: { id: string }) => p.id === run.prompt_id)
          if (!prompt) continue

          // Extract entities from each sampled response. Cache identical samples
          // (common at low temperature) so we don't pay for duplicate extractions.
          const cache = new Map<string, Awaited<ReturnType<typeof extractEntities>>>()
          const extractions = []
          for (const resp of run.responses) {
            let ex = cache.get(resp)
            if (!ex) {
              ex = await extractEntities(resp, prompt.prompt, run.model)
              cache.set(resp, ex)
            }
            extractions.push(ex)
          }
          const n = run.responses.length

          // Aggregate every entity across samples, keyed by normalized name.
          const byName = new Map<string, {
            name: string; type: string; positions: number[]; sentiments: string[]
            reasons: Set<string>; confidences: number[]
          }>()
          for (const ex of extractions) {
            for (const ent of ex.entities) {
              const key = ent.name.toLowerCase().trim()
              if (!byName.has(key)) {
                byName.set(key, { name: ent.name, type: ent.type, positions: [], sentiments: [], reasons: new Set(), confidences: [] })
              }
              const agg = byName.get(key)!
              if (ent.position) agg.positions.push(ent.position)
              if (ent.sentiment) agg.sentiments.push(ent.sentiment)
              for (const r of ent.reasons) agg.reasons.add(r)
              if (typeof ent.confidence === 'number') agg.confidences.push(ent.confidence)
            }
          }

          // Persist one aggregated entity row per distinct name.
          for (const agg of byName.values()) {
            const avgPos = average(agg.positions)
            const position = avgPos !== null ? Math.round(avgPos) : null
            const sentiment = majoritySentiment(agg.sentiments) ?? 'neutral'

            const { data: entityRow } = await supabaseAdmin
              .from('entities')
              .insert({
                audit_id,
                model:      run.model,
                prompt_id:  run.prompt_id,
                name:       agg.name,
                type:       agg.type,
                position,
                context:    null,
                sentiment,
                confidence: average(agg.confidences),
              })
              .select('id')
              .single()

            if (entityRow && agg.reasons.size > 0) {
              await supabaseAdmin.from('recommendation_reasons').insert(
                [...agg.reasons].map((reason: string) => ({ entity_id: entityRow.id, audit_id, reason }))
              )
            }

            results.push({
              name:      agg.name,
              position:  position ?? 0,
              sentiment,
              reasons:   [...agg.reasons],
              model:     run.model,
              prompt_id: run.prompt_id,
            })
          }

          // Aggregate the TARGET across samples → mention frequency.
          let mentionedCount = 0
          const targetPositions: number[] = []
          const targetSentiments: string[] = []
          for (let i = 0; i < extractions.length; i++) {
            const ex = extractions[i]
            const t = findTargetInEntities(entity.name, ex.entities)
            if (t) {
              mentionedCount++
              if (t.position) targetPositions.push(t.position)
              if (t.sentiment) targetSentiments.push(t.sentiment)
            } else if (ex.failed) {
              // LLM extraction failed for this sample — fall back to cheap keyword
              // detection for the target so we don't silently drop a mention.
              const kw = keywordTargetMention(entity.name, run.responses[i])
              if (kw) {
                mentionedCount++
                if (kw.position) targetPositions.push(kw.position)
                targetSentiments.push(kw.sentiment)
              }
            }
          }
          const frequency = n > 0 ? mentionedCount / n : 0
          const avgTargetPos = average(targetPositions)

          await supabaseAdmin.from('mentions').insert({
            audit_id,
            model:             run.model,
            prompt_id:         run.prompt_id,   // generator's text id; lets computeMetrics count prompts
            restaurant_name:   entity.name,
            // `mentioned` is now a MAJORITY threshold over samples (>= 0.5). The
            // graded signal lives in `mention_frequency`. Legacy readers that only
            // look at `mentioned` (e.g. lib/engine/metrics.ts) still work but lose
            // the sub-threshold nuance — see the note there.
            mentioned:         frequency >= 0.5,
            mention_frequency: frequency,
            position:          avgTargetPos !== null ? Math.round(avgTargetPos) : null,
            sentiment:         targetSentiments.length ? majoritySentiment(targetSentiments) : null,
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
        model:             m.model as any,
        prompt_id:         m.prompt_id,
        mentioned:         m.mentioned,
        mention_frequency: m.mention_frequency,
        position:          m.position,
        sentiment:         m.sentiment,
      }))

      const entityData = entities.map((e: any) => ({
        name:      e.name,
        position:  e.position ?? 0,
        sentiment: e.sentiment ?? 'neutral',
        reasons:   [],
        model:     e.model,
        prompt_id: e.prompt_id,
      }))

      const metrics = computeFullMetrics(entity.name, mentionData, entityData)

      await supabaseAdmin.from('visibility_scores').insert({
        audit_id,
        restaurant_id:             restaurant_id,
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
