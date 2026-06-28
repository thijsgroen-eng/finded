import { createHash, randomUUID } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase/client'
import { currentAlgoVersions } from '@/lib/versions'

/**
 * Observation Engine V2 — warehouse writer (deterministic, no LLM).
 *
 * Replays one audit's operational rows into the append-only warehouse: upserts
 * the dimensions and writes the facts (provider responses, citations, evidence,
 * audit rollup). Used by both the pipeline dual-write and the historical backfill.
 *
 * Idempotent per audit: existing warehouse rows for the audit are removed first,
 * then re-inserted (one generation per audit) — so re-running never duplicates.
 * Immutability holds across DIFFERENT audits; a re-processed audit replaces only
 * its own rows. Best-effort callers must wrap this so it never fails an audit.
 */

const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const sentimentNum = (s: string | null) => s === 'positive' ? 1 : s === 'negative' ? -1 : s == null ? null : 0

function domainOf(url: string): string | null {
  try { return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./i, '').toLowerCase() || null } catch { return null }
}
function citationType(domain: string): string {
  if (/tripadvisor/.test(domain)) return 'review'
  if (/thefork|lafourchette|iens|eet\.nu|opentable|resengo/.test(domain)) return 'directory'
  if (/google|maps\.app|goo\.gl/.test(domain)) return 'maps'
  if (/michelin|gaultmillau|lonelyplanet|timeout/.test(domain)) return 'guide'
  if (/instagram|facebook|tiktok|x\.com|twitter|linkedin/.test(domain)) return 'social'
  if (/nu\.nl|nrc|volkskrant|parool|news|nos\.nl/.test(domain)) return 'news'
  return 'other'
}

/** Replay one completed audit into the warehouse. Returns counts, or null on no-op. */
export async function writeWarehouseForAudit(auditId: string): Promise<{ responses: number; citations: number } | null> {
  const ver = currentAlgoVersions()

  const { data: audit } = await supabaseAdmin
    .from('audits').select('id, restaurant_id, created_at, status').eq('id', auditId).maybeSingle()
  if (!audit) return null
  const observedAt = audit.created_at
  const restaurantId = audit.restaurant_id

  const { data: rest } = await supabaseAdmin
    .from('restaurants').select('id, cuisine, city, country, business_type, domain').eq('id', restaurantId).maybeSingle()

  // ── dim_restaurant ──
  if (rest) {
    await supabaseAdmin.from('dim_restaurant').upsert({
      restaurant_id: rest.id, cuisine: rest.cuisine, city: rest.city, country: rest.country,
      business_type: rest.business_type, updated_at: new Date().toISOString(),
    }, { onConflict: 'restaurant_id' })
  }

  // ── dim_feature_snapshot (one reusable row per website state) ──
  let featureSnapshotId: string | null = null
  const { data: wa } = await supabaseAdmin
    .from('website_audits')
    .select('schema_present, menu_or_services_present, menu_format, opening_hours_present, reservation_links_present, booking_present, social_links_present, faq_present, review_signals, review_count, raw_html_snippet')
    .eq('audit_id', auditId).maybeSingle()
  if (wa && restaurantId) {
    const signals = {
      schema_detected: !!wa.schema_present,
      menu_detected: !!wa.menu_or_services_present,
      menu_format: wa.menu_format ?? null,
      opening_hours: !!wa.opening_hours_present,
      reservation_widget: !!(wa.reservation_links_present ?? wa.booking_present),
      social_links: !!wa.social_links_present,
      faq_detected: !!wa.faq_present,
      review_links: !!wa.review_signals || (wa.review_count ?? 0) > 0,
    }
    const websiteHash = sha(JSON.stringify(signals) + (wa.raw_html_snippet ?? '').slice(0, 2000))
    const { data: snap } = await supabaseAdmin.from('dim_feature_snapshot').upsert({
      restaurant_id: restaurantId, website_hash: websiteHash, crawl_version: 'v1',
      ...signals, observed_at: observedAt,
    }, { onConflict: 'restaurant_id,website_hash,crawl_version' }).select('id').maybeSingle()
    featureSnapshotId = snap?.id ?? null
  }

  // ── Load operational rows ──
  const [{ data: runs }, { data: prompts }, { data: mentions }, { data: vs }] = await Promise.all([
    supabaseAdmin.from('model_runs').select('id, model, model_version, prompt_id, sample_index, grounded, status, error, sources, tokens_used, duration_ms, raw_response, parsed_response').eq('audit_id', auditId),
    supabaseAdmin.from('prompt_runs').select('prompt_id, category, intent, prompt_text, language').eq('audit_id', auditId),
    supabaseAdmin.from('mentions').select('model, prompt_id, sample_index, mentioned, position, sentiment').eq('audit_id', auditId),
    supabaseAdmin.from('visibility_scores').select('visibility_score, confidence_score, mention_frequency').eq('audit_id', auditId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  // ── dim_provider (provider+model+version) → id map ──
  const providerKey = (m: string, v: string | null) => `${m}|${v ?? 'unknown'}`
  const providerId = new Map<string, string>()
  for (const r of runs ?? []) {
    const key = providerKey(r.model, r.model_version)
    if (providerId.has(key)) continue
    const { data: dp } = await supabaseAdmin.from('dim_provider').upsert({
      provider: r.model, model: r.model_version ?? 'unknown', version: r.model_version ?? 'unknown', last_seen: new Date().toISOString(),
    }, { onConflict: 'provider,model,version' }).select('id').maybeSingle()
    if (dp) providerId.set(key, dp.id)
  }

  // ── dim_prompt (by hash) → id map keyed by the generator's prompt_id text ──
  const promptId = new Map<string, string>()
  for (const p of prompts ?? []) {
    const hash = sha(p.prompt_text ?? p.prompt_id)
    const { data: dpr } = await supabaseAdmin.from('dim_prompt').upsert({
      prompt_hash: hash, category: p.category ?? null, intent: p.intent ?? null, language: p.language ?? null, example_text: (p.prompt_text ?? '').slice(0, 500),
    }, { onConflict: 'prompt_hash' }).select('id').maybeSingle()
    if (dpr) promptId.set(p.prompt_id, dpr.id)
  }

  const mentionKey = (m: string, p: string, s: number) => `${m}|${p}|${s}`
  const mentionMap = new Map<string, { mentioned: boolean; position: number | null; sentiment: string | null }>()
  for (const m of mentions ?? []) mentionMap.set(mentionKey(m.model, m.prompt_id, m.sample_index ?? 0), { mentioned: m.mentioned, position: m.position, sentiment: m.sentiment })

  // ── Wipe this audit's facts (idempotent), then insert ──
  await Promise.all([
    supabaseAdmin.from('fact_provider_response').delete().eq('audit_id', auditId),
    supabaseAdmin.from('fact_citation').delete().eq('audit_id', auditId),
    supabaseAdmin.from('fact_response_evidence').delete().eq('audit_id', auditId),
    supabaseAdmin.from('fact_entity').delete().eq('audit_id', auditId),
    supabaseAdmin.from('fact_recommendation').delete().eq('audit_id', auditId),
    supabaseAdmin.from('fact_audit').delete().eq('audit_id', auditId),
  ])

  const responseRows: Record<string, unknown>[] = []
  const evidenceRows: Record<string, unknown>[] = []
  const citationRows: Record<string, unknown>[] = []
  const responseIdByKey = new Map<string, string>()   // model|prompt|sample → response_id
  const providerIdByModel = new Map<string, string>() // model → any provider_id (for entities)

  for (const r of runs ?? []) {
    const responseId = randomUUID()
    responseIdByKey.set(mentionKey(r.model, r.prompt_id, r.sample_index ?? 0), responseId)
    const pid = providerId.get(providerKey(r.model, r.model_version))
    if (pid && !providerIdByModel.has(r.model)) providerIdByModel.set(r.model, pid)
    const mn = mentionMap.get(mentionKey(r.model, r.prompt_id, r.sample_index ?? 0))
    const failed = r.status === 'failed' || !r.raw_response || r.raw_response.startsWith('ERROR:')
    const sources: string[] = Array.isArray(r.sources) ? r.sources : []
    const quality = failed ? 0 : 1   // deterministic: provider success (extended later with parser/extraction confidence)

    responseRows.push({
      response_id: responseId, audit_id: auditId, restaurant_id: restaurantId,
      provider_id: providerId.get(providerKey(r.model, r.model_version)) ?? null,
      prompt_id: promptId.get(r.prompt_id) ?? null, feature_snapshot_id: featureSnapshotId,
      sample_index: r.sample_index ?? 0, grounded: r.grounded ?? null,
      mentioned: mn?.mentioned ?? false, mention_position: mn?.position ?? null,
      mention_count: mn?.mentioned ? 1 : 0, sentiment: sentimentNum(mn?.sentiment ?? null),
      response_length: (r.raw_response ?? '').length, no_result: failed || !(r.raw_response ?? '').trim(),
      duplicate_response: false, error: r.error ?? null, tokens: r.tokens_used ?? null, cost_cents: null,
      duration_ms: r.duration_ms ?? null, quality_score: quality,
      prompt_version: ver.parser, parser_version: ver.parser, scoring_version: ver.scoring,
      recommendation_version: ver.recommendation, benchmark_version: ver.benchmark, extraction_version: ver.extraction,
      observed_at: observedAt,
    })
    if (!failed) {
      evidenceRows.push({
        response_id: responseId, audit_id: auditId, response_hash: sha(r.raw_response ?? ''),
        structured_response: { raw: (r.raw_response ?? '').slice(0, 20000), parsed: r.parsed_response ?? null },
        citations: sources, parsed_entities: r.parsed_response ?? null, observed_at: observedAt,
      })
      for (const url of sources) {
        const d = domainOf(url); if (!d) continue
        citationRows.push({
          response_id: responseId, audit_id: auditId,
          provider_id: providerId.get(providerKey(r.model, r.model_version)) ?? null,
          prompt_id: promptId.get(r.prompt_id) ?? null, restaurant_id: restaurantId,
          entity_name: null, domain: d, url, citation_type: citationType(d),
          is_own_site: !!(rest?.domain && d === rest.domain), observed_at: observedAt,
        })
      }
    }
  }

  // Insert in chunks.
  const chunk = async (table: string, rows: Record<string, unknown>[]) => {
    for (let i = 0; i < rows.length; i += 500) await supabaseAdmin.from(table).insert(rows.slice(i, i + 500))
  }
  await chunk('fact_provider_response', responseRows)
  await chunk('fact_response_evidence', evidenceRows)
  await chunk('fact_citation', citationRows)

  // ── fact_entity (competitors + co-occurrence) ──
  const { data: entities } = await supabaseAdmin
    .from('entities').select('model, prompt_id, sample_index, name, normalized_name, is_target, position, sentiment').eq('audit_id', auditId)
  const entityRows = (entities ?? []).map((e) => ({
    response_id: responseIdByKey.get(mentionKey(e.model, e.prompt_id, e.sample_index ?? 0)) ?? null,
    audit_id: auditId, restaurant_id: restaurantId,
    provider_id: providerIdByModel.get(e.model) ?? null, prompt_id: promptId.get(e.prompt_id) ?? null,
    name: e.name, normalized_name: e.normalized_name, is_target: !!e.is_target,
    position: e.position, sentiment: sentimentNum(e.sentiment), observed_at: observedAt,
  }))
  await chunk('fact_entity', entityRows)

  // ── fact_recommendation (impact columns back-annotated later) ──
  const { data: recs } = await supabaseAdmin
    .from('recommendations').select('type, priority, impact_level, effort, difficulty, confidence, expected_impact').eq('audit_id', auditId)
  const recRows = (recs ?? []).map((r) => ({
    audit_id: auditId, restaurant_id: restaurantId,
    type: r.type ?? null, category: r.type ?? null, priority: r.priority ?? r.impact_level ?? null,
    difficulty: r.difficulty ?? r.effort ?? null, confidence: r.confidence ?? null, expected_impact: r.expected_impact ?? null,
    visibility_before: vs?.visibility_score ?? null,
    scoring_version: ver.scoring, recommendation_version: ver.recommendation, benchmark_version: ver.benchmark,
    observed_at: observedAt,
  }))
  await chunk('fact_recommendation', recRows)

  // ── fact_audit rollup ──
  if (vs) {
    const mentionedAny = (mentions ?? []).some((m) => m.mentioned)
    const completed = (runs ?? []).filter((r) => r.status !== 'failed' && !(r.raw_response ?? '').startsWith('ERROR:')).length
    const total = (runs ?? []).length || 1
    await supabaseAdmin.from('fact_audit').insert({
      audit_id: auditId, restaurant_id: restaurantId, feature_snapshot_id: featureSnapshotId,
      visibility_score: vs.visibility_score, confidence_score: vs.confidence_score,
      mentioned_any: mentionedAny, mention_frequency: vs.mention_frequency,
      quality_score: completed / total,
      scoring_version: ver.scoring, parser_version: ver.parser, recommendation_version: ver.recommendation,
      benchmark_version: ver.benchmark, extraction_version: ver.extraction, observed_at: observedAt,
    })
  }

  return { responses: responseRows.length, citations: citationRows.length }
}
