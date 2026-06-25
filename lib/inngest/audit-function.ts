import { inngest } from '@/lib/inngest/client'
import { supabaseAdmin } from '@/lib/supabase/client'
import { getAvailableProviders } from '@/lib/providers'
import { AUDIT_TEMPERATURE } from '@/lib/providers/types'
import { auditWebsite } from '@/lib/engine/website-auditor'
import { getFullPromptsFromStore } from '@/lib/engine/prompt-store'
import { extractEntities, findTargetInEntities, keywordTargetMention } from '@/lib/engine/entity-extractor'
import { normalizeName } from '@/lib/engine/normalize'
import { matchEntity } from '@/lib/audit/entity-matching'
import { aggregateCompetitors } from '@/lib/audit/competitors'
import { buildAuthoritySignals } from '@/lib/audit/authority'
import { computeFullMetrics } from '@/lib/engine/metrics-v2'
import { computeScoreBreakdown } from '@/lib/engine/scoring'
import { sendEmail, reportReadyEmail } from '@/lib/email/send'
import { languageForCountry, asLanguage } from '@/lib/i18n'

/** True if an operator has stopped this audit (status set to 'cancelled'). */
async function isCancelled(auditId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from('audits').select('status').eq('id', auditId).single()
  return data?.status === 'cancelled'
}

// We run the full 32-prompt core set across all providers. With 32 prompts × 4
// models the data is already dense, so the default is 1 sample per (prompt,model)
// — the mention-frequency confidence band is computed over all those cells.
// Raise AUDIT_SAMPLES for extra robustness (multiplies cost + time); MAX_PROMPTS
// and SAMPLES are env-tunable to stay within the serverless timeout.
const SAMPLES = Math.min(5, Math.max(1, Number(process.env.AUDIT_SAMPLES ?? 1)))
const MAX_PROMPTS = Math.max(1, Number(process.env.AUDIT_MAX_PROMPTS ?? 32))
const AUDIT_GROUNDED = (process.env.AUDIT_GROUNDED ?? 'true') !== 'false'

export const auditFunction = inngest.createFunction(
  {
    id: 'run-full-audit',
    name: 'Run Full AI Visibility Audit',
    retries: 2,
    timeouts: { finish: '20m' },
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
          // Menu & dietary discoverability (015)
          menu_format:               result.menu_format,
          menu_richness:             result.menu_richness,
          dietary:                   result.dietary,
        })
      }
    })

    // ── Step 3: Generate prompts ──────────────────────────────
    const { prompts } = await step.run(`generate-prompts-${audit_id}`, async () => {
      // Finded is restaurant-first, so always generate RESTAURANT prompts. A stored
      // business_type like 'other' would otherwise hit the generic fallback templates
      // and produce meaningless prompts ("Beste other other Amsterdam"). Cuisine
      // (when known) drives the cuisine-specific prompts; no cuisine → those are
      // simply skipped rather than filled with a placeholder.
      const businessType = 'restaurant'
      const subtypes: string[] = (entity.subtypes && entity.subtypes.length)
        ? entity.subtypes
        : (entity.cuisine ? [entity.cuisine] : [])

      // Cap at MAX_PROMPTS: sampling multiplies calls by SAMPLES × providers, so
      // we use the top of the (cuisine-forward) quick set to bound cost/timeout.
      const generated = (await getFullPromptsFromStore(
        entity.name,
        businessType,
        entity.city,
        entity.country ?? 'Netherlands',
        subtypes[0],
        subtypes,
        language,
      )).slice(0, MAX_PROMPTS)

      await supabaseAdmin.from('prompt_runs').insert(
        generated.map((p: { id: string; category: string; intent: string; prompt: string; importance?: number }) => ({
          audit_id,
          prompt_id:   p.id,
          category:    p.category,
          intent:      p.intent,
          prompt_text: p.prompt,
          language,
          weight:      p.importance ?? null,
          active:      true,
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
    let stopped = false

    for (const promptObj of prompts) {
      // Stop early if an operator cancelled the audit (checked once per prompt).
      if (await step.run(`cancel-check-${audit_id}-${promptObj.id}`, () => isCancelled(audit_id))) {
        stopped = true
        break
      }
      for (let sample = 0; sample < SAMPLES; sample++) {
        const { ok } = await step.run(`sample-${audit_id}-${promptObj.id}-s${sample}`, async () => {
          let ok = 0

          await Promise.all(
            providers.map(async (provider: any) => {
              // ── Run lifecycle: create the audit_run BEFORE the call ──────────
              // so a crash still leaves a record, and failures/retries are
              // first-class (status + retry_of_run_id) rather than an ERROR: prefix.
              const { data: prior } = await supabaseAdmin
                .from('model_runs')
                .select('id')
                .eq('audit_id', audit_id)
                .eq('prompt_id', promptObj.id)
                .eq('sample_index', sample)
                .eq('model', provider.name)
                .order('created_at', { ascending: false })
                .limit(1)
              const retryOf = prior && prior.length ? prior[0].id : null

              const { data: runRow } = await supabaseAdmin
                .from('model_runs')
                .insert({
                  audit_id,
                  restaurant_id:   entity.id,
                  model:           provider.name,
                  prompt_id:       promptObj.id,   // generator's text id (no longer a prompts FK)
                  prompt_text_id:  promptObj.id,
                  prompt_text:     promptObj.prompt,
                  sample_index:    sample,
                  locale:          language,
                  status:          'running',
                  started_at:      new Date().toISOString(),
                  retry_of_run_id: retryOf,
                  raw_response:    '',              // filled on completion (column is NOT NULL)
                  metadata:        { temperature: AUDIT_TEMPERATURE, grounded: AUDIT_GROUNDED && provider.supportsGrounding },
                })
                .select('id')
                .single()
              const runId = runRow?.id ?? null

              let result: any
              try {
                result = await provider.runPrompt(promptObj.prompt, {
                  temperature: AUDIT_TEMPERATURE,
                  grounded: AUDIT_GROUNDED && provider.supportsGrounding,
                })
              } catch (e: any) {
                result = { error: e?.message ?? 'provider threw', response: '', duration_ms: null }
              }

              const failed = !!result.error || !result.response
              await supabaseAdmin.from('model_runs').update({
                status:        failed ? 'failed' : 'completed',
                error:         result.error ?? null,
                completed_at:  new Date().toISOString(),
                grounded:      result.grounded ?? null,
                model_version: result.model_version ?? null,
                temperature:   result.temperature ?? null,
                sources:       result.sources && result.sources.length ? result.sources : null,
                raw_response:  result.error ? `ERROR: ${result.error}` : result.response,
                tokens_used:   result.tokens_used ?? null,
                duration_ms:   result.duration_ms ?? null,
              }).eq('id', runId)

              if (failed) return
              ok++

              // Parse THIS sample independently (no cross-sample caching).
              const extraction = await extractEntities(result.response, promptObj.prompt, provider.name)

              for (const ent of extraction.entities) {
                // Resolve each extracted name against the target so the mention is
                // self-describing evidence (normalized name, target flag, why).
                const m = matchEntity(
                  { name: ent.name },
                  { id: entity.id, name: entity.name, domain: (entity as any).domain ?? null },
                )
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
                    normalized_name:       normalizeName(ent.name),
                    is_target:             m.matched,
                    matched_restaurant_id: m.matchedRestaurantId,
                    match_reason:          m.reason ? `${m.reason} (${m.confidence.toFixed(2)})` : null,
                    evidence_excerpt:      ent.context ? ent.context.slice(0, 280) : null,
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

    // Operator stopped it mid-run: leave status 'cancelled', skip scoring/complete.
    if (stopped || (await step.run(`cancel-check-final-${audit_id}`, () => isCancelled(audit_id)))) {
      await step.run(`dequeue-cancelled-${audit_id}`, async () => {
        await supabaseAdmin.from('audit_queue').delete().eq('audit_id', audit_id)
      })
      return { success: false, audit_id, cancelled: true }
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
        .select('schema_present, menu_present, opening_hours_present, reservation_links_present, social_links_present, review_signals, review_count')
        .eq('audit_id', audit_id)
        .single()
      const websiteSignals = wa
        ? { present: [wa.schema_present, wa.menu_present, wa.opening_hours_present, wa.reservation_links_present, wa.social_links_present].filter(Boolean).length, total: 5 }
        : null
      const providersRan = new Set(mentions.map((m: any) => m.model)).size

      // Authority signal (0–1): did AI cite the restaurant's own site, and does it
      // have review signals? Real proxies for off-site authority (we don't crawl
      // third-party platforms). Drives the new authority_score component.
      const { data: srcRows } = await supabaseAdmin
        .from('model_runs').select('sources').eq('audit_id', audit_id)
      const allSources = (srcRows ?? []).flatMap((r: any) => Array.isArray(r.sources) ? r.sources : [])
      const authoritySig = buildAuthoritySignals(allSources, (entity as any).domain ?? null)
      const reviewSignals = !!(wa?.review_signals) || (wa?.review_count ?? 0) > 0
      const authorityScore = (wa || allSources.length > 0)
        ? (authoritySig.ownCited ? 0.6 : 0) + (reviewSignals ? 0.4 : 0)
        : null

      // Transparent, documented, stored score breakdown — supersedes the opaque score.
      const breakdown = computeScoreBreakdown({
        mentionFrequency: metrics.mention_frequency,
        modelConsensus:   metrics.model_consensus,
        providersRan:     Math.max(1, providersRan),
        shareOfVoice:     metrics.share_of_voice,
        authorityScore,
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
        // Revenue/visitor estimates removed — not measurable, kept out for credibility.
        estimated_visitors_min:    null,
        estimated_visitors_max:    null,
        estimated_revenue_min:     null,
        estimated_revenue_max:     null,
        total_mentions:            metrics.total_mentions,
        total_prompts:             metrics.total_prompts,
        total_model_runs:          metrics.total_model_runs,
      })

      // Aggregate competitors directly from the stored entity rows so every row is
      // traceable evidence (counts + provenance), not bare numbers.
      const competitorRows = aggregateCompetitors(
        (entities as any[]).map((e) => ({
          name: e.name, model: e.model, prompt_id: e.prompt_id, position: e.position,
          sentiment: e.sentiment, is_target: e.is_target, normalized_name: e.normalized_name,
          evidence_excerpt: e.evidence_excerpt, context: e.context,
        })),
        entity.name,
      )
      if (competitorRows.length > 0) {
        await supabaseAdmin.from('competitors').insert(
          competitorRows.map((c) => ({ audit_id, ...c })),
        )
      }

      await supabaseAdmin
        .from('audits')
        .update({ total_prompts: metrics.total_prompts, total_model_runs: metrics.total_model_runs })
        .eq('id', audit_id)
    })

    // ── Step 6b: Crawl top competitors (why they're recommended instead) ──────
    // Reuses the website crawler (no external API). Resolves each competitor's
    // own site from the AI citation sources; skips ones we can't confidently match.
    await step.run(`crawl-competitors-${audit_id}`, async () => {
      const [{ data: comps }, { data: srcRows }] = await Promise.all([
        supabaseAdmin.from('competitors').select('name, canonical_key, mention_count').eq('audit_id', audit_id).order('mention_count', { ascending: false }).limit(3),
        supabaseAdmin.from('model_runs').select('sources').eq('audit_id', audit_id),
      ])
      if (!comps || comps.length === 0) return { crawled: 0 }
      const sources = (srcRows ?? []).flatMap((r: any) => Array.isArray(r.sources) ? r.sources : [])

      const { resolveCompetitorUrl } = await import('@/lib/audit/competitor-resolve')
      let crawled = 0
      for (const c of comps) {
        const url = resolveCompetitorUrl(c.name, sources)
        if (!url) continue
        const signals = await auditWebsite(url).catch(() => null)
        if (!signals || signals.error) continue
        await supabaseAdmin.from('competitor_audits').insert({
          audit_id, competitor_name: c.name, normalized_name: c.canonical_key, website: url, signals,
        })
        crawled++
      }
      return { crawled }
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

    // Email the requester their report (only when this audit came from a public
    // request and email is configured). Best-effort — never fails the audit.
    await step.run(`notify-requester-${audit_id}`, async () => {
      const { data: req } = await supabaseAdmin
        .from('audit_requests').select('email').eq('audit_id', audit_id).maybeSingle()
      if (!req?.email) return { skipped: true }
      const { data: r } = await supabaseAdmin
        .from('restaurants').select('name, preview_slug').eq('id', restaurant_id).single()
      const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://finded.vercel.app').replace(/\/$/, '')
      const reportUrl = r?.preview_slug ? `${base}/report/${r.preview_slug}` : null
      const mail = reportReadyEmail({ restaurantName: r?.name, reportUrl })
      return sendEmail({ to: req.email, subject: mail.subject, html: mail.html, text: mail.text })
    })

    return { success: true, audit_id }
  }
)
