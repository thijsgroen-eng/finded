import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { getAvailableProviders } from '@/lib/providers'
import { buildRunAccounting } from '@/lib/engine/audit-evidence'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MODEL_LABELS: Record<string, string> = {
  openai: 'ChatGPT', anthropic: 'Claude', gemini: 'Gemini', perplexity: 'Perplexity',
}
const ORDER = ['openai', 'anthropic', 'gemini', 'perplexity']

type Band = 'green' | 'yellow' | 'red' | 'unknown'
function band(rate: number, total: number): Band {
  if (total === 0) return 'unknown'
  if (rate >= 0.8) return 'green'
  if (rate >= 0.5) return 'yellow'
  return 'red'
}

/**
 * GET /api/admin/provider-health            (admin-gated)
 *   default → per-provider health derived from recent model_runs (no API cost).
 *   ?test=1 → live ping: one cheap ungrounded call per configured provider.
 *
 * Shows at a glance whether ChatGPT / Claude / Gemini / Perplexity are reachable,
 * so a dead key or empty credit balance is obvious before running a full audit.
 */
export async function GET(request: NextRequest) {
  const live = new URL(request.url).searchParams.get('test') === '1'
  const configured = getAvailableProviders().map((p) => p.name as string)

  if (live) {
    const providers = getAvailableProviders()
    const results = await Promise.all(
      providers.map(async (provider: any) => {
        const started = Date.now()
        try {
          const r = await provider.runPrompt('Reply with the single word: OK.', { temperature: 0, grounded: false })
          const ok = !r.error && !!r.response
          return { model: provider.name, label: MODEL_LABELS[provider.name] ?? provider.name, configured: true, ok, band: (ok ? 'green' : 'red') as Band, error: r.error ?? null, duration_ms: Date.now() - started }
        } catch (e: any) {
          return { model: provider.name, label: MODEL_LABELS[provider.name] ?? provider.name, configured: true, ok: false, band: 'red' as Band, error: e?.message ?? 'provider threw', duration_ms: Date.now() - started }
        }
      }),
    )
    results.sort((a, b) => ORDER.indexOf(a.model) - ORDER.indexOf(b.model))
    return NextResponse.json({ mode: 'live', providers: results })
  }

  // Derived from recent runs (cheap). Last 500 model_runs by recency.
  const { data: runs } = await supabaseAdmin
    .from('model_runs')
    .select('model, status, raw_response, error, created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  const acc = buildRunAccounting((runs ?? []) as any[])
  const byModel = new Map(acc.providers.map((p) => [p.model, p]))
  // Most-recent error per provider (helps explain a red status).
  const lastError = new Map<string, string>()
  for (const r of (runs ?? []) as any[]) {
    const failed = r.status === 'failed' || (r.raw_response ?? '').startsWith('ERROR:')
    if (failed && !lastError.has(r.model)) lastError.set(r.model, (r.error ?? r.raw_response ?? '').toString().replace(/^ERROR:\s*/, '').slice(0, 160))
  }

  const models = [...new Set([...configured, ...acc.providers.map((p) => p.model)])]
  const providers = models.map((model) => {
    const p = byModel.get(model)
    const total = p?.runs ?? 0
    const completed = p?.completed ?? 0
    const rate = total > 0 ? completed / total : 0
    return {
      model,
      label: MODEL_LABELS[model] ?? model,
      configured: configured.includes(model),
      total, completed, failed: p?.failed ?? 0,
      rate,
      band: band(rate, total),
      error: lastError.get(model) ?? null,
    }
  }).sort((a, b) => ORDER.indexOf(a.model) - ORDER.indexOf(b.model))

  return NextResponse.json({ mode: 'recent', sample: runs?.length ?? 0, providers })
}
