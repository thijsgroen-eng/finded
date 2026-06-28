import { supabaseAdmin } from '@/lib/supabase/client'

/**
 * Recommendation impact back-annotation (deterministic, no LLM).
 *
 * For each IMPLEMENTED recommendation, measure the visibility change it preceded:
 *  - visibility_before = the restaurant's latest audit score on/before the
 *    implementation date
 *  - visibility_after  = the restaurant's earliest audit score after it
 *  - visibility_change = after − before ; days_until_effect = days between
 *  - verified = a follow-up audit exists
 *
 * This is the one sanctioned mutation of the append-only warehouse (documented in
 * the V2 design): it updates only the impact columns of fact_recommendation for
 * the (restaurant, type) it concerns. Scores are read from fact_audit (the SoT).
 */
export async function annotateRecommendationImpact(): Promise<{ scanned: number; updated: number }> {
  // Implemented recommendations with a date (the operator marked them done).
  const { data: recs } = await supabaseAdmin
    .from('recommendations')
    .select('restaurant_id, type, implemented_at')
    .eq('status', 'implemented')
    .not('implemented_at', 'is', null)
    .not('restaurant_id', 'is', null)
  if (!recs || recs.length === 0) return { scanned: 0, updated: 0 }

  // Dedupe to one (restaurant, type, earliest implementation date).
  const byKey = new Map<string, { restaurantId: string; type: string | null; date: string }>()
  for (const r of recs) {
    const key = `${r.restaurant_id}|${r.type ?? ''}`
    const cur = byKey.get(key)
    if (!cur || new Date(r.implemented_at) < new Date(cur.date)) byKey.set(key, { restaurantId: r.restaurant_id, type: r.type, date: r.implemented_at })
  }

  let updated = 0
  for (const { restaurantId, type, date } of byKey.values()) {
    const impl = new Date(date).getTime()
    const { data: scores } = await supabaseAdmin
      .from('fact_audit')
      .select('visibility_score, observed_at')
      .eq('restaurant_id', restaurantId)
      .not('visibility_score', 'is', null)
      .order('observed_at', { ascending: true })
    if (!scores || scores.length === 0) continue

    let before: number | null = null
    let after: number | null = null
    let afterAt: string | null = null
    for (const s of scores) {
      const t = new Date(s.observed_at).getTime()
      if (t <= impl) before = Number(s.visibility_score)
      else if (after == null) { after = Number(s.visibility_score); afterAt = s.observed_at }
    }
    const verified = after != null
    const change = before != null && after != null ? after - before : null
    const days = afterAt != null ? Math.round((new Date(afterAt).getTime() - impl) / 86_400_000) : null

    const patch: Record<string, unknown> = {
      implemented: true, implementation_date: date, verified,
      visibility_before: before, visibility_after: after, visibility_change: change, days_until_effect: days,
    }
    let q = supabaseAdmin.from('fact_recommendation').update(patch).eq('restaurant_id', restaurantId)
    q = type == null ? q.is('type', null) : q.eq('type', type)
    const { error } = await q
    if (!error) updated++
  }

  return { scanned: byKey.size, updated }
}
