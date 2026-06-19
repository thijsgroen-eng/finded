import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/client'
import { createAudit } from '@/lib/engine/audit-runner'
import { getAvailableProviders } from '@/lib/providers'
import { verifyCronRequest } from '@/lib/auth/cron'

// Mirror the audit pipeline's internal sampling knobs so the cost estimate is accurate.
// (audit-function.ts uses these same values: SAMPLES clamp 1..5, quick set capped at 8.)
const SAMPLES = Math.min(5, Math.max(1, Number(process.env.AUDIT_SAMPLES ?? 3)))
const MAX_PROMPTS = 8

const MODELS = ['openai', 'anthropic', 'gemini', 'perplexity'] as const

interface Stats {
  per_run: number[]
  mean: number
  median: number
  min: number
  max: number
  range: number
  stddev: number
  coefficient_of_variation: number
}

function round(n: number, dp = 4): number {
  const f = 10 ** dp
  return Math.round(n * f) / f
}

function computeStats(values: number[]): Stats | null {
  const arr = values.filter((v) => Number.isFinite(v))
  if (arr.length === 0) return null
  const n = arr.length
  const sorted = [...arr].sort((a, b) => a - b)
  const mean = arr.reduce((a, b) => a + b, 0) / n
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2
  const min = sorted[0]
  const max = sorted[n - 1]
  const variance = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / n // population
  const stddev = Math.sqrt(variance)
  return {
    per_run: arr.map((v) => round(v)),
    mean: round(mean),
    median: round(median),
    min: round(min),
    max: round(max),
    range: round(max - min),
    stddev: round(stddev),
    coefficient_of_variation: mean !== 0 ? round(stddev / mean) : 0,
  }
}

function verdict(visibilityRange: number): string {
  if (visibilityRange <= 5) return 'STABLE — defensible'
  if (visibilityRange <= 10) return 'ACCEPTABLE — note the band when presenting'
  return 'UNSTABLE — increase SAMPLES or pin temperature lower'
}

/**
 * POST /api/reliability-test
 * Body: { restaurant_id: string, runs?: number }   runs default 3, clamped 1..5.
 * Fires K independent full audits for the restaurant, all tagged with one
 * reliability_group, and returns immediately with a poll_url.
 */
export async function POST(request: NextRequest) {
  // Admin-only. NOTE: the app has no dedicated admin auth yet (that task was
  // deferred), so this reuses the CRON_SECRET gate (verifyCronRequest), which
  // fails closed in production. Send `x-cron-secret` or `Authorization: Bearer`.
  const denied = verifyCronRequest(request)
  if (denied) return denied

  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const restaurant_id = typeof body.restaurant_id === 'string' ? body.restaurant_id : null
  if (!restaurant_id) {
    return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })
  }
  const runs = Math.min(5, Math.max(1, Math.floor(Number(body.runs ?? 3)) || 3))

  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('id, name')
    .eq('id', restaurant_id)
    .single()
  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
  }

  const group_id = randomUUID()

  // Cost: K runs × N internal samples × providers × prompts answering calls, plus
  // ~1 Claude extraction per successful answer.
  const providerCount = Math.max(1, getAvailableProviders().length)
  const answering = runs * SAMPLES * providerCount * MAX_PROMPTS
  const extraction = answering
  const estimated_api_calls = answering + extraction

  // Fire K independent audits via the existing trigger (each gets a unique audit_id,
  // so Inngest steps + event ids never collide).
  const audit_ids = await Promise.all(
    Array.from({ length: runs }, (_, i) =>
      createAudit(restaurant_id, { reliabilityGroup: group_id, runIndex: i })
    )
  )

  return NextResponse.json({
    group_id,
    runs,
    status: 'running',
    estimated_api_calls,
    estimate_breakdown: {
      runs,
      samples_per_prompt: SAMPLES,
      providers: providerCount,
      prompts: MAX_PROMPTS,
      answering_calls: answering,
      extraction_calls: extraction,
    },
    audit_ids,
    poll_url: `/api/reliability-test?group_id=${group_id}`,
  })
}

/**
 * GET /api/reliability-test?group_id=...
 * Returns { status: 'running', completed, total } until all K audits have a
 * visibility_scores row, then the full between-audit stability stats.
 */
export async function GET(request: NextRequest) {
  const denied = verifyCronRequest(request)
  if (denied) return denied

  const group_id = new URL(request.url).searchParams.get('group_id')
  if (!group_id) {
    return NextResponse.json({ error: 'group_id required' }, { status: 400 })
  }

  const { data: audits } = await supabaseAdmin
    .from('audits')
    .select('id, status, reliability_run_index')
    .eq('reliability_group', group_id)
    .order('reliability_run_index', { ascending: true })

  if (!audits || audits.length === 0) {
    return NextResponse.json({ error: 'Unknown group_id' }, { status: 404 })
  }

  const total = audits.length
  const failed = audits.filter((a) => a.status === 'failed').map((a) => a.id)
  const auditIds = audits.map((a) => a.id)

  const { data: scores } = await supabaseAdmin
    .from('visibility_scores')
    .select('audit_id, visibility_score, mention_frequency')
    .in('audit_id', auditIds)

  const completed = scores?.length ?? 0

  // Still running — unless some audits failed and none can ever complete.
  if (completed < total) {
    if (failed.length > 0 && completed + failed.length >= total) {
      return NextResponse.json({
        status: 'incomplete',
        completed,
        failed: failed.length,
        total,
        note: 'Some audits failed (see audits.error_message / model_runs). Re-run the test.',
      })
    }
    return NextResponse.json({ status: 'running', completed, total, group_id })
  }

  const visValues = (scores ?? []).map((s) => Number(s.visibility_score))
  const freqValues = (scores ?? []).map((s) => Number(s.mention_frequency))
  const visStats = computeStats(visValues)
  const freqStats = computeStats(freqValues)

  // Per-model: mention rate per audit per model, from the raw mentions rows.
  const { data: mentions } = await supabaseAdmin
    .from('mentions')
    .select('audit_id, model, mentioned')
    .in('audit_id', auditIds)

  const tally = new Map<string, { mentioned: number; total: number }>()
  for (const m of mentions ?? []) {
    const key = `${m.audit_id}|${m.model}`
    const t = tally.get(key) ?? { mentioned: 0, total: 0 }
    t.total++
    if (m.mentioned) t.mentioned++
    tally.set(key, t)
  }

  const per_model: Record<string, Stats> = {}
  for (const model of MODELS) {
    const perRun = auditIds
      .map((id) => tally.get(`${id}|${model}`))
      .filter((t): t is { mentioned: number; total: number } => !!t && t.total > 0)
      .map((t) => t.mentioned / t.total)
    const s = computeStats(perRun)
    if (s) per_model[model] = s
  }

  return NextResponse.json({
    status: 'complete',
    group_id,
    runs: total,
    verdict: visStats ? verdict(visStats.range) : 'NO DATA',
    visibility_score: visStats,
    mention_frequency: freqStats,
    per_model,
  })
}
