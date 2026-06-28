import { inngest } from '@/lib/inngest/client'
import { supabaseAdmin } from '@/lib/supabase/client'
import { getEnabledProviders } from '@/lib/providers'
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
import { buildRunAccounting } from '@/lib/engine/audit-evidence'
import { reliabilityFromAccounting, assessReliability } from '@/lib/audit/reliability'
import { recordObservation, recordObservationChange } from '@/lib/observations'
import { ensureDashboardSlug, dashboardUrl } from '@/lib/dashboard'
import { sendEmail, reportReadyEmail, monitoringSummaryEmail } from '@/lib/email/send'
import { asLanguage } from '@/lib/i18n'
import { resolveAuditLanguage, getSettings } from '@/lib/settings'
import { currentAlgoVersions } from '@/lib/versions'
import { emitEvent } from '@/lib/audit/events'
import { estimateAuditCostCents, checkDailyBudget, recordSpendCents } from '@/lib/cost'

/** Run a provider call with a hard timeout so a hung provider can't block its
 *  parallel cohort up to the function's finish ceiling. A timeout reads as a
 *  failed call (same handling as any other error). */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ])
}

type Health = { model: string; ok: boolean; error: string | null }
const HEALTH_TTL_MS = 5 * 60 * 1000

/** Cached provider health (#10), if every given provider has a fresh OK entry.
 *  Lets a batch of audits skip the per-audit live preflight. null = must check. */
async function freshHealthCache(models: string[]): Promise<Health[] | null> {
  try {
    const { data } = await supabaseAdmin.from('provider_health').select('model, ok, error, checked_at').in('model', models)
    if (!data || data.length < models.length) return null
    const cutoff = Date.now() - HEALTH_TTL_MS
    const fresh = data.every((r: any) => r.ok && new Date(r.checked_at).getTime() >= cutoff)
    return fresh ? data.map((r: any) => ({ model: r.model, ok: r.ok, error: r.error ?? null })) : null
  } catch {
    return null
  }
}

async function writeHealthCache(health: Health[]): Promise<void> {
  try {
    await supabaseAdmin.from('provider_health').upsert(
      health.map((h) => ({ model: h.model, ok: h.ok, error: h.error, checked_at: new Date().toISOString() })),
      { onConflict: 'model' },
    )
  } catch { /* cache only */ }
}

/** True if an operator has stopped this audit (status set to 'cancelled'). */
async function isCancelled(auditId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from('audits').select('status').eq('id', auditId).single()
  return data?.status === 'cancelled'
}

// Audit knobs (samples, prompt count, web-search grounding) are controlled from
// Settings → Audit & cost. An env var, when set, still OVERRIDES the setting
// (handy for one-off batch tuning). Resolved per-run inside the handler.
function auditConfig(s: { grounded: boolean; maxPrompts: number; samples: number }) {
  const envSamples = process.env.AUDIT_SAMPLES
  const envMaxPrompts = process.env.AUDIT_MAX_PROMPTS
  const envGrounded = process.env.AUDIT_GROUNDED
  return {
    SAMPLES: Math.min(5, Math.max(1, Number(envSamples ?? s.samples))),
    MAX_PROMPTS: Math.max(1, Number(envMaxPrompts ?? s.maxPrompts)),
    AUDIT_GROUNDED: envGrounded != null ? envGrounded !== 'false' : s.grounded,
  }
}
// Pre-flight provider health check: one cheap call per provider before the full
// matrix runs, so a dead provider (no credit / bad key) aborts the audit in
// seconds instead of after dozens of failed calls. Set AUDIT_PREFLIGHT=false to
// disable (reverts to running the full matrix regardless).
const AUDIT_PREFLIGHT = (process.env.AUDIT_PREFLIGHT ?? 'true') !== 'false'

const MODEL_LABELS: Record<string, string> = {
  openai: 'ChatGPT', anthropic: 'Claude', gemini: 'Gemini', perplexity: 'Perplexity',
}

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
      // Stamp the algorithm versions that will produce this audit (#1), so it stays
      // reproducible/explainable forever even if the algorithms change later.
      await supabaseAdmin
        .from('audits')
        .update({ status: 'running', algo_versions: currentAlgoVersions() })
        .eq('id', audit_id)

      const { data } = await supabaseAdmin
        .from('restaurants')
        .select('*')
        .eq('id', restaurant_id)
        .single()

      if (!data) throw new Error(`Entity ${restaurant_id} not found`)
      await emitEvent(audit_id, 'audit.running', { data: { restaurant_id } })
      return { entity: data }
    })

    // Audit language: AUDIT_LANGUAGE env overrides; otherwise the operator's
    // Settings decide (default Dutch, or per-country when "always" is off).
    // Computed once so both prompt generation and model_runs provenance use it.
    const language = process.env.AUDIT_LANGUAGE
      ? asLanguage(process.env.AUDIT_LANGUAGE)
      : await resolveAuditLanguage(entity.country)

    // Cost/quality knobs from Settings (env overrides). Drives prompt count,
    // samples and whether each model call does a live web search. The full
    // settings object is also used for cost controls (#10) below.
    const settings = await getSettings()
    const { SAMPLES, MAX_PROMPTS, AUDIT_GROUNDED } = auditConfig(settings)
    const PROVIDER_TIMEOUT_MS = settings.providerTimeoutMs
    // Adaptive execution (#5): OFF by default → full parallel matrix (unchanged).
    const ADAPTIVE = settings.adaptiveExecution
    const ADAPTIVE_STOP = settings.adaptiveStopOnMentions

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
      await emitEvent(audit_id, 'crawler.finished', { data: { website: entity.website ?? null, ok: !result.error } })
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

      await emitEvent(audit_id, 'prompts.generated', { data: { count: generated.length, language } })
      return { prompts: generated }
    })

    // ── Steps 4+5: sample each prompt N×, parsing every sample independently ──
    // For each (prompt, sample) we run all providers in parallel and write one
    // model_runs + per-sample entities + one target mentions row, each tagged with
    // sample_index. The Inngest step name includes audit_id + prompt id + sample so
    // results are never cached (otherwise every "sample" would be identical).
    const providers = await getEnabledProviders()

    // ── Cost guardrail (#10) ──────────────────────────────────
    // Estimate this audit's cost up front and refuse to start if it would blow the
    // operator's daily budget (0 = no cap, the default → behaviour unchanged).
    // Memoized in a step so Inngest retries don't double-count the ledger.
    const budget = await step.run(`budget-${audit_id}`, async () => {
      const estimateCents = estimateAuditCostCents(
        { grounded: AUDIT_GROUNDED, groundedCallCents: settings.groundedCallCents, ungroundedCallCents: settings.ungroundedCallCents },
        prompts.length, Math.max(1, providers.length), SAMPLES,
      )
      const check = await checkDailyBudget(settings, estimateCents)
      if (check.allowed) await recordSpendCents(estimateCents)
      return check
    })

    if (!budget.allowed) {
      await step.run(`budget-abort-${audit_id}`, async () => {
        await supabaseAdmin.from('audits').update({
          status: 'incomplete',
          error_message:
            `Audit not started — estimated cost €${(budget.estimateCents / 100).toFixed(2)} would exceed today's ` +
            `remaining budget (spent €${(budget.spentCents / 100).toFixed(2)} of €${(budget.budgetCents / 100).toFixed(2)}). ` +
            `Raise or clear the daily budget in Settings, or run it tomorrow.`,
          completed_at: new Date().toISOString(),
        }).eq('id', audit_id)
        await supabaseAdmin.from('audit_queue').delete().eq('audit_id', audit_id)
        await emitEvent(audit_id, 'budget.exceeded', { data: budget })
        await emitEvent(audit_id, 'audit.incomplete', { data: { reason: 'budget' } })
      })
      return { success: false, audit_id, reason: 'daily budget exceeded', budget }
    }

    // ── Pre-flight provider health check ──────────────────────
    // One cheap, ungrounded call per provider. If too few are reachable to clear
    // the reliability gate, abort NOW with the real per-provider errors (e.g.
    // "Claude: credit balance too low") instead of burning the whole matrix.
    if (AUDIT_PREFLIGHT && providers.length > 0) {
      const health = await step.run(`preflight-${audit_id}`, async () => {
        const names = providers.map((p: any) => p.name)
        // Reuse a fresh health cache (#10) so a batch of audits doesn't re-probe
        // every provider for each restaurant.
        const cached = await freshHealthCache(names)
        if (cached) {
          await emitEvent(audit_id, 'preflight.finished', { data: { cached: true, healthy: cached.length } })
          return cached
        }
        const live: Health[] = await Promise.all(
          providers.map(async (provider: any) => {
            try {
              const r: any = await withTimeout(
                provider.runPrompt('Reply with the single word: OK.', { temperature: 0, grounded: false }),
                PROVIDER_TIMEOUT_MS, `${provider.name} preflight`,
              )
              return { model: provider.name, ok: !r.error && !!r.response, error: r.error ?? null }
            } catch (e: any) {
              return { model: provider.name, ok: false, error: e?.message ?? 'provider threw' }
            }
          }),
        )
        await writeHealthCache(live)
        await emitEvent(audit_id, 'preflight.finished', { data: { cached: false, healthy: live.filter((h) => h.ok).length } })
        return live
      })

      const healthy = health.filter((h: any) => h.ok)
      const dead = health.filter((h: any) => !h.ok)
      const preflightRel = assessReliability({
        total: providers.length,
        completed: healthy.length,
        providers: health.map((h: any) => ({ model: h.model, completed: h.ok ? 1 : 0, failed: h.ok ? 0 : 1 })),
      })

      if (preflightRel.band === 'red') {
        await step.run(`preflight-abort-${audit_id}`, async () => {
          const reasons = dead
            .map((d: any) => `${MODEL_LABELS[d.model] ?? d.model}: ${String(d.error ?? 'unavailable').slice(0, 160)}`)
            .join(' | ')
          await supabaseAdmin.from('audits').update({
            status: 'incomplete',
            reliability: preflightRel,
            error_message:
              `Audit aborted before running — only ${healthy.length} of ${providers.length} AI providers are reachable, ` +
              `below the 50% reliability threshold. ${reasons}. Fix provider billing/keys and re-run.`,
            completed_at: new Date().toISOString(),
          }).eq('id', audit_id)
          await supabaseAdmin.from('audit_queue').delete().eq('audit_id', audit_id)
          await emitEvent(audit_id, 'audit.incomplete', { data: { reason: 'preflight', healthy: healthy.length, providers: providers.length } })
        })
        return { success: false, audit_id, reason: 'preflight failed', reliability: preflightRel }
      }
    }

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
          // One provider's full run for this (prompt, sample): record → call →
          // parse → store entities + mention. Returns whether it succeeded and
          // whether the target was mentioned (drives adaptive early-stop).
          const runProvider = async (provider: any): Promise<{ ok: boolean; mentioned: boolean }> => {
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
                  // Raw-evidence provenance (#2): variables that filled the template
                  // and the prompt category, so the call is replayable later.
                  prompt_vars:     { city: entity.city ?? null, country: entity.country ?? null, cuisine: entity.cuisine ?? null, category: promptObj.category ?? null, business_type: 'restaurant' },
                  metadata:        { temperature: AUDIT_TEMPERATURE, grounded: AUDIT_GROUNDED && provider.supportsGrounding },
                })
                .select('id')
                .single()
              const runId = runRow?.id ?? null

              let result: any
              try {
                result = await withTimeout(
                  provider.runPrompt(promptObj.prompt, {
                    temperature: AUDIT_TEMPERATURE,
                    grounded: AUDIT_GROUNDED && provider.supportsGrounding,
                  }),
                  PROVIDER_TIMEOUT_MS, `${provider.name} call`,
                )
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

              if (failed) return { ok: false, mentioned: false }

              // Parse THIS sample independently (no cross-sample caching).
              const extraction = await extractEntities(result.response, promptObj.prompt, provider.name)

              // Persist the parsed extraction (#2) so parser changes can be replayed
              // offline (golden tests) without re-calling the provider.
              await supabaseAdmin.from('model_runs').update({
                parsed_response: {
                  entities: extraction.entities,
                  total_mentioned: extraction.total_mentioned,
                  failed: extraction.failed,
                },
              }).eq('id', runId)

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

              return { ok: true, mentioned }
          }

          let ok = 0
          if (ADAPTIVE) {
            // Sequential with early stop once enough providers mention the target.
            let mentionedCount = 0
            for (const provider of providers) {
              const r = await runProvider(provider)
              if (r.ok) ok++
              if (r.mentioned) mentionedCount++
              if (mentionedCount >= ADAPTIVE_STOP) break
            }
          } else {
            // Default: every provider, in parallel (full matrix — unchanged).
            const results = await Promise.all(providers.map(runProvider))
            ok = results.filter((r) => r.ok).length
          }

          return { ok }
        })

        totalSuccessful += ok
      }
    }

    // Operator stopped it mid-run: leave status 'cancelled', skip scoring/complete.
    if (stopped || (await step.run(`cancel-check-final-${audit_id}`, () => isCancelled(audit_id)))) {
      await step.run(`dequeue-cancelled-${audit_id}`, async () => {
        await supabaseAdmin.from('audit_queue').delete().eq('audit_id', audit_id)
        await emitEvent(audit_id, 'audit.cancelled')
      })
      return { success: false, audit_id, cancelled: true }
    }

    // ── Reliability gate ──────────────────────────────────────
    // Assess how many model calls actually succeeded, per provider, from the
    // model_runs ledger (which records failures too). This is the single guard
    // that stops the audit presenting low-confidence data as fact:
    //   red  (<50% success / no provider with data) → mark 'incomplete', request
    //        a rerun, and STOP before scoring/competitors/recommendations.
    //   yellow/green → continue; the band + completion rate are stored and feed
    //        the confidence score and the report's warning banner.
    const reliability = await step.run(`assess-reliability-${audit_id}`, async () => {
      const { data: runs } = await supabaseAdmin
        .from('model_runs')
        .select('model, prompt_id, sample_index, grounded, model_version, locale, duration_ms, raw_response, status')
        .eq('audit_id', audit_id)
      const acc = buildRunAccounting((runs ?? []) as any[])
      const rel = reliabilityFromAccounting(acc)
      // Durable snapshot for the admin list/detail + report (no recompute needed).
      await supabaseAdmin.from('audits').update({ reliability: rel }).eq('id', audit_id)
      await emitEvent(audit_id, 'matrix.finished', { data: { completed: acc.completed, failed: acc.failed, total: acc.total_runs } })
      await emitEvent(audit_id, 'reliability.assessed', { data: { band: rel.band, completionRate: rel.completionRate } })
      return rel
    })

    if (reliability.band === 'red') {
      await step.run(`incomplete-${audit_id}`, async () => {
        await supabaseAdmin
          .from('audits')
          .update({
            status: 'incomplete',
            error_message:
              `Audit incomplete — ${reliability.detail} Below the 50% reliability threshold, ` +
              `so no visibility score, competitor analysis or recommendations were generated. Please re-run the audit ` +
              `(check provider API keys and credit balance — see model_runs for the per-call errors).`,
            completed_at: new Date().toISOString(),
          })
          .eq('id', audit_id)
        await supabaseAdmin.from('audit_queue').delete().eq('audit_id', audit_id)
        await emitEvent(audit_id, 'audit.incomplete', { data: { reason: 'reliability', band: reliability.band } })
      })
      return { success: false, audit_id, reason: 'reliability below threshold', reliability }
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
      // Consensus denominator = providers we ATTEMPTED, not just the ones that
      // succeeded. Otherwise a run where only Gemini answered reads as "1 of 1
      // models" (100% consensus) instead of the honest "1 of 3".
      const providersRan = Math.max(providers.length, new Set(mentions.map((m: any) => m.model)).size)

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
        completionRate:   reliability.completionRate,
      })

      // Idempotent: clear any prior score for this audit (reprocessing), then
      // insert and HARD-FAIL on error — never silently complete without a score
      // (that's what left audits showing "—/100" and the PDF "no score" error).
      await supabaseAdmin.from('visibility_scores').delete().eq('audit_id', audit_id)
      const { error: vsError } = await supabaseAdmin.from('visibility_scores').insert({
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
        // Internal analytics only (not shown in customer reports). Stored from the
        // computed estimates so the column's NOT NULL constraint is satisfied.
        estimated_visitors_min:    metrics.estimated_additional_visitors_min ?? 0,
        estimated_visitors_max:    metrics.estimated_additional_visitors_max ?? 0,
        estimated_revenue_min:     metrics.estimated_revenue_min ?? 0,
        estimated_revenue_max:     metrics.estimated_revenue_max ?? 0,
        total_mentions:            metrics.total_mentions,
        total_prompts:             metrics.total_prompts,
        total_model_runs:          metrics.total_model_runs,
      })
      if (vsError) throw new Error(`Failed to save visibility score: ${vsError.message}`)

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
      await supabaseAdmin.from('competitors').delete().eq('audit_id', audit_id)
      if (competitorRows.length > 0) {
        await supabaseAdmin.from('competitors').insert(
          competitorRows.map((c) => ({ audit_id, ...c })),
        )
      }

      await supabaseAdmin
        .from('audits')
        .update({ total_prompts: metrics.total_prompts, total_model_runs: metrics.total_model_runs })
        .eq('id', audit_id)
      await emitEvent(audit_id, 'score.calculated', { data: { visibility_score: breakdown.visibility_score, confidence_score: breakdown.confidence_score } })
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
      await emitEvent(audit_id, 'competitors.crawled', { data: { crawled } })
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

    // ── Step 6d: Observation Engine ───────────────────────────
    // Contribute one anonymized fact-record to the knowledge base that powers
    // benchmarks, pattern lift and recommendation confidence over time.
    await step.run(`record-observation-${audit_id}`, async () => {
      const [{ data: vs }, { data: wa }, { data: ms }] = await Promise.all([
        supabaseAdmin.from('visibility_scores').select('visibility_score, mention_frequency').eq('audit_id', audit_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabaseAdmin.from('website_audits').select('schema_present, schema_types, menu_format, faq_present, dietary, review_signals, review_count, opening_hours_present, location_present, contact_present').eq('audit_id', audit_id).single(),
        supabaseAdmin.from('mentions').select('model, mentioned').eq('audit_id', audit_id),
      ])
      const mentions = ms ?? []
      const mentionedBy = {
        openai:     mentions.some((m: any) => m.model === 'openai' && m.mentioned),
        anthropic:  mentions.some((m: any) => m.model === 'anthropic' && m.mentioned),
        gemini:     mentions.some((m: any) => m.model === 'gemini' && m.mentioned),
        perplexity: mentions.some((m: any) => m.model === 'perplexity' && m.mentioned),
      }
      const schemaTypes = (wa?.schema_types ?? []).map((t: string) => t.toLowerCase())
      const obsInput = {
        auditId: audit_id,
        restaurantId: restaurant_id,
        city: entity.city ?? null,
        cuisine: entity.cuisine ?? null,
        country: entity.country ?? null,
        businessType: 'restaurant',
        visibilityScore: vs?.visibility_score != null ? Number(vs.visibility_score) : null,
        mentionFrequency: vs?.mention_frequency != null ? Number(vs.mention_frequency) : null,
        mentionedAny: mentions.some((m: any) => m.mentioned),
        menuFormat: wa?.menu_format ?? null,
        schemaPresent: !!wa?.schema_present,
        restaurantSchema: schemaTypes.some((t: string) => t.includes('restaurant') || t.includes('localbusiness')),
        faqPresent: !!wa?.faq_present,
        dietaryPresent: (wa?.dietary?.length ?? 0) > 0,
        reviewsPresent: !!wa?.review_signals || (wa?.review_count ?? 0) > 0,
        openingHoursPresent: !!wa?.opening_hours_present,
        locationPresent: !!(wa?.location_present || wa?.contact_present),
        mentionedBy,
        algoVersions: currentAlgoVersions(),
      }
      await recordObservation(obsInput)
      // Append-only signal-change log vs the previous audit (#11). Best-effort.
      const change = await recordObservationChange(obsInput).catch(() => null)
      await emitEvent(audit_id, 'observation.recorded', change ? { data: { visibilityDelta: change.visibilityDelta } } : undefined)
    })

    // ── Step 6e: Warehouse V2 dual-write ──────────────────────
    // Replay this audit into the analytical warehouse (dims + facts). Best-effort
    // and fully isolated — a warehouse failure never affects the audit. Legacy
    // observations above remain the source of truth until V2 is validated.
    await step.run(`warehouse-${audit_id}`, async () => {
      try {
        const { writeWarehouseForAudit } = await import('@/lib/warehouse/write')
        const r = await writeWarehouseForAudit(audit_id)
        return r ?? { skipped: true }
      } catch (e) {
        return { error: e instanceof Error ? e.message.slice(0, 200) : 'warehouse write failed' }
      }
    })

    // ── Step 7: Complete + create the permanent dashboard ─────
    // Every audit yields a dashboard — a secure, hard-to-guess slug the customer
    // returns to. Created here (not gated on checkout), so the magic-link email
    // always has a destination.
    const dashboardSlug = await step.run(`complete-${audit_id}`, async () => {
      await supabaseAdmin
        .from('audits')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', audit_id)
      await supabaseAdmin.from('audit_queue').delete().eq('audit_id', audit_id)
      // Advance the prospecting pipeline: a completed audit makes this restaurant
      // a workable prospect. Don't override a hand-set later status (contacted, customer…).
      await supabaseAdmin
        .from('restaurants')
        .update({ prospect_status: 'audit_complete' })
        .eq('id', restaurant_id)
        .in('prospect_status', ['not_audited', 'audit_queued'])
      const slug = await ensureDashboardSlug(restaurant_id, entity.name)
      if (slug) await emitEvent(audit_id, 'dashboard.published', { data: { slug } })
      await emitEvent(audit_id, 'audit.completed')
      return slug
    })

    // Email the requester a MAGIC LINK to their dashboard (the dashboard is the
    // product; the PDF is just an export from it). Best-effort — never fails the
    // audit. Only when the audit came from a public request and email is set up.
    await step.run(`notify-requester-${audit_id}`, async () => {
      const reportUrl = dashboardSlug ? dashboardUrl(dashboardSlug) : null
      const { data: auditRow } = await supabaseAdmin
        .from('audits').select('source').eq('id', audit_id).maybeSingle()

      // Monitoring rerun → send the "what changed" digest to the restaurant's
      // contact, using the Observation Engine change log (#12). First-time audits
      // keep the original behaviour exactly.
      if (auditRow?.source === 'monitoring') {
        if (!entity.email) return { skipped: true }
        const [{ data: chg }, { data: vs }] = await Promise.all([
          supabaseAdmin.from('observation_changes').select('visibility_delta, facts_changed, providers_changed').eq('audit_id', audit_id).maybeSingle(),
          supabaseAdmin.from('visibility_scores').select('visibility_score').eq('audit_id', audit_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ])
        const mail = monitoringSummaryEmail({
          restaurantName: entity.name,
          visibilityScore: vs?.visibility_score != null ? Number(vs.visibility_score) : null,
          visibilityDelta: chg?.visibility_delta != null ? Number(chg.visibility_delta) : null,
          factsChanged: (chg?.facts_changed ?? {}) as Record<string, { from: boolean; to: boolean }>,
          providersChanged: (chg?.providers_changed ?? {}) as Record<string, { from: boolean; to: boolean }>,
          reportUrl,
          lang: language === 'nl' ? 'nl' : 'en',
        })
        const res = await sendEmail({ to: entity.email, subject: mail.subject, html: mail.html, text: mail.text })
        await emitEvent(audit_id, 'email.sent', { data: { to: entity.email, kind: 'monitoring', sent: !!res?.sent } })
        return res
      }

      const { data: req } = await supabaseAdmin
        .from('audit_requests').select('email').eq('audit_id', audit_id).maybeSingle()
      if (!req?.email) return { skipped: true }
      const mail = reportReadyEmail({ restaurantName: entity.name, reportUrl })
      const res = await sendEmail({ to: req.email, subject: mail.subject, html: mail.html, text: mail.text })
      await emitEvent(audit_id, 'email.sent', { data: { to: req.email, sent: !!res?.sent } })
      return res
    })

    return { success: true, audit_id }
  }
)
