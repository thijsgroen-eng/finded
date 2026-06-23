import { inngest } from '@/lib/inngest/client'
import { supabaseAdmin } from '@/lib/supabase/client'
import { getAvailableProviders } from '@/lib/providers'
import { AUDIT_TEMPERATURE } from '@/lib/providers/types'
import { auditWebsite } from '@/lib/engine/website-auditor'
import { getQuickPrompts } from '@/lib/engine/prompt-generator'
import { extractEntities, findTargetInEntities, keywordTargetMention } from '@/lib/engine/entity-extractor'
import { computeFullMetrics } from '@/lib/engine/metrics-v2'
import { computeScoreBreakdown } from '@/lib/engine/scoring'
import { languageForCountry, asLanguage } from '@/lib/i18n'

// Each prompt is sampled SAMPLES times at the pinned AUDIT_TEMPERATURE (0.7);
// every sample is written + parsed independently so metrics-v2 can report a
// frequency band. The quick prompt set is capped at MAX_PROMPTS to bound cost
// and stay within the serverless timeout. AUDIT_SAMPLES=1 → cheap single-shot.
const SAMPLES = Math.min(5, Math.max(1, Number(process.env.AUDIT_SAMPLES ?? 3)))
const MAX_PROMPTS = 8
const AUDIT_GROUNDED = (process.env.AUDIT_GROUNDED ?? 'true') !== 'false'

export const auditFunction = inngest.createFunction(
  {
    id: 'run-full-audit',
    name: 'Run Full AI Visibility Audit',
    retries: 2,
    timeouts: { finish: '15m' },
    triggers: [{ event: 'audit/requested' }],
    // After all retries are exhausted, mark the audit failed with the error so it
    // doesn't sit on "running" forever with no explanation.
    onFailure: async ({ event, error }: { event: any; error: any }) => {
      const auditId = event?.data?.event?.data?.audit_id
      if (!auditId) return
      await supabaseAdmin
        .from('audits')
        .update({
          status: 'failed',
          error_message: String(error?.message ?? 'Audit failed').slice(0, 500),
          completed_at: new Date().toISOString(),
        })
        .eq('id', auditId)
      await supabaseAdmin.from('audit_queue').delete().eq('audit_id', auditId)
    },
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

    // Audit language (NL/BE → Dutch, else English; AUDIT_LANGUAGE overrides).
    // Computed once so both prompt generation and model_runs provenance use it.
    const language = process.env.AUDIT_LANGUAGE
      ? asLanguage(process.env.AUDIT_LANGUAGE)
      : languageForCountry(entity.country)

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

      // Cap at MAX_PROMPTS: sampling multiplies calls by SAMPLES × providers, so
      // we use the top of the (cuisine-forward) quick set to bound cost/timeout.
      const generated = getQuickPrompts(
        entity.name,
        businessType,
        entity.city,
        entity.country ?? 'Netherlands',
        subtypes[0],
        subtypes,
        language,
      ).slice(0, MAX_PROMPTS)

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

    // ── Steps 4+5: sample each prompt N×, parsing every sample independently ──
    // For each (prompt, sample) we run all providers in parallel and write one
    // model_runs + per-sample entities + one target mentions row, each tagged with
    // sample_index. The Inngest step name includes audit_id + prompt id + sample so
    // results are never cached (otherwise every "sample" would be identical).
    const providers = getAvailableProviders()
    let totalSuccessful = 0

    for (const promptObj of prompts) {
      for (let sample = 0; sample < SAMPLES; sample++) {
        const { ok } = await step.run(`sample-${audit_id}-${promptObj.id}-s${sample}`, async () => {
          let ok = 0

          await Promise.all(
            providers.map(async (provider: any) => {
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
                model_version:  result.model_version ?? null,
                temperature:    result.temperature ?? null,
                locale:         language,
                sources:        result.sources && result.sources.length ? result.sources : null,
                raw_response:   result.error ? `ERROR: ${result.error}` : result.response,
                tokens_used:    result.tokens_used ?? null,
                duration_ms:    result.duration_ms,
              })

              if (result.error || !result.response) return
              ok++

              // Parse THIS sample independently (no cross-sample caching).
              const extraction = await extractEntities(result.response, promptObj.prompt, provider.name)

              for (const ent of extraction.entities) {
                const { data: entityRow } = await supabaseAdmin
                  .from('entities')
                  .insert({
                    audit_id,
                    model:        provider.name,
                    prompt_id:    promptObj.id,
                    sample_index: sample,
                    name:         ent.name,
                    type:         ent.type,
                    position:     ent.position,
                    context:      ent.context,
                    sentiment:    ent.sentiment,
                    confidence:   ent.confidence,
                  })
                  .select('id')
                  .single()

                if (entityRow && ent.reasons.length > 0) {
                  await supabaseAdmin.from('recommendation_reasons').insert(
                    ent.reasons.map((reason: string) => ({ entity_id: entityRow.id, audit_id, reason }))
                  )
                }
              }

              // Target mention for this sample (keyword fallback if extraction failed).
              const target = findTargetInEntities(entity.name, extraction.entities)
              let mentioned = target !== null
              let position = target?.position ?? null
              let sentiment: string | null = target?.sentiment ?? null
              if (!target && extraction.failed) {
                const kw = keywordTargetMention(entity.name, result.response)
                if (kw) { mentioned = true; position = kw.position; sentiment = kw.sentiment }
              }

              await supabaseAdmin.from('mentions').insert({
                audit_id,
                model:             provider.name,
                prompt_id:         promptObj.id,
                sample_index:      sample,
                restaurant_name:   entity.name,
                mentioned,
                mention_frequency: null, // per-sample row; the band is computed in metrics-v2
                position,
                sentiment,
              })
            })
          )

          return { ok }
        })

        totalSuccessful += ok
      }
    }

    // If every model call failed (bad/missing key or no credit), fail with a clear
    // reason instead of completing with silent zeros (raw errors are in model_runs).
    if (totalSuccessful === 0) {
      await step.run(`no-successful-runs-${audit_id}`, async () => {
        await supabaseAdmin
          .from('audits')
          .update({
            status: 'failed',
            error_message: 'All model calls failed — check provider API keys and credit balance (see model_runs for details).',
            completed_at: new Date().toISOString(),
          })
          .eq('id', audit_id)
        await supabaseAdmin.from('audit_queue').delete().eq('audit_id', audit_id)
      })
      return { success: false, audit_id, reason: 'no successful model responses' }
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

      // Website AI-readiness signals → website_signal_score component.
      const { data: wa } = await supabaseAdmin
        .from('website_audits')
        .select('schema_present, menu_present, opening_hours_present, reservation_links_present, social_links_present')
        .eq('audit_id', audit_id)
        .single()
      const websiteSignals = wa
        ? { present: [wa.schema_present, wa.menu_present, wa.opening_hours_present, wa.reservation_links_present, wa.social_links_present].filter(Boolean).length, total: 5 }
        : null
      const providersRan = new Set(mentions.map((m: any) => m.model)).size

      // Transparent, documented, stored score breakdown — supersedes the opaque score.
      const breakdown = computeScoreBreakdown({
        mentionFrequency: metrics.mention_frequency,
        avgPosition:      metrics.avg_position,
        modelConsensus:   metrics.model_consensus,
        providersRan:     Math.max(1, providersRan),
        promptCoverage:   metrics.prompt_coverage,
        shareOfVoice:     metrics.share_of_voice,
        websiteSignals,
        sampleCount:      metrics.sample_count,
      })

      await supabaseAdmin.from('visibility_scores').insert({
        audit_id,
        restaurant_id:             restaurant_id,
        visibility_score:          breakdown.visibility_score,
        confidence_score:          breakdown.confidence_score,
        score_breakdown:           breakdown,
        opportunity_score:         metrics.opportunity_score,
        opportunity_label:         metrics.opportunity_label,
        mention_frequency:         metrics.mention_frequency,
        confidence_lo:             metrics.confidence_lo,
        confidence_hi:             metrics.confidence_hi,
        sample_count:              metrics.sample_count,
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
            canonical_key:   c.canonical_key,
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
