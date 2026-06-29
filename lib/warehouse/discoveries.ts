import { supabaseAdmin } from '@/lib/supabase/client'
import { twoPropTest, slope } from '@/lib/warehouse/stats'
import { SIGNAL_DEFS } from '@/lib/warehouse/restaurant'

/**
 * Public "Latest discoveries" feed (deterministic, no LLM, aggregate-only).
 *
 * Reads the warehouse materialized views and surfaces only statistically
 * significant, well-sampled findings — each with an effect size, sample size and
 * confidence. Safe for the marketing site: nothing here is an individual
 * restaurant's data. Tolerant: returns [] if the views aren't populated yet.
 */

const MIN_N = 10
const CONF_GATE = 0.9

export interface PublicDiscovery {
  key: string                       // signal key, or 'visibility_index' for the trend
  kind: 'correlation' | 'trend'
  dir: 'up' | 'down'
  effectPct: number                 // % lift (correlation) or points/month (trend)
  measured: number                  // sample size
  confidence: number | null         // 0–1, null for the trend line
}

export async function getPublicDiscoveries(limit = 4): Promise<PublicDiscovery[]> {
  const safe = async <T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T | null> => {
    try { const { data, error } = await p; return error ? null : data } catch { return null }
  }
  const [signals, index] = await Promise.all([
    safe(supabaseAdmin.from('mv_signal_correlation').select('*')),
    safe(supabaseAdmin.from('research_ai_visibility_index').select('month, n, avg_visibility').order('month', { ascending: true })),
  ])

  const corrByKey = new Map<string, any>(((signals as any[]) ?? []).map((s) => [s.signal, s]))
  const out: PublicDiscovery[] = []

  for (const def of SIGNAL_DEFS) {
    const s = corrByKey.get(def.key); if (!s) continue
    const nWith = Number(s.n_with ?? 0), nWithout = Number(s.n_without ?? 0)
    const rWith = Number(s.ment_with ?? 0), rWithout = Number(s.ment_without ?? 0)
    if (nWith < MIN_N || nWithout < MIN_N || rWithout <= 0) continue
    const lift = rWith / rWithout
    const { confidence } = twoPropTest(Math.round(rWith * nWith), nWith, Math.round(rWithout * nWithout), nWithout)
    if (Math.abs(lift - 1) < 0.1 || confidence < CONF_GATE) continue
    out.push({
      key: def.key, kind: 'correlation', dir: lift >= 1 ? 'up' : 'down',
      effectPct: Math.abs(Math.round((lift - 1) * 100)), measured: nWith + nWithout, confidence,
    })
  }
  out.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))

  // Industry-wide visibility trend as one discovery (if there is enough history).
  const idx = ((index as any[]) ?? []).map((r) => ({ n: Number(r.n), avg: r.avg_visibility == null ? null : Number(r.avg_visibility) }))
  if (idx.length >= 3) {
    const sl = slope(idx.map((r) => r.avg ?? 0))
    if (Math.abs(sl) >= 0.5) {
      out.push({
        key: 'visibility_index', kind: 'trend', dir: sl > 0 ? 'up' : 'down',
        effectPct: Math.abs(Math.round(sl * 10) / 10), measured: idx.reduce((a, r) => a + r.n, 0), confidence: null,
      })
    }
  }

  return out.slice(0, limit)
}
