import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { createAudit } from '@/lib/engine/audit-runner'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')

  try {
    switch (query) {

      // ── Overview stats ────────────────────────────────────────
      case 'overview': {
        const [
          { count: totalRestaurants },
          { count: totalAudits },
          { count: completedAudits },
          { count: failedAudits },
          { count: runningAudits },
          { data: scores },
        ] = await Promise.all([
          supabaseAdmin.from('restaurants').select('id', { count: 'exact', head: true }),
          supabaseAdmin.from('audits').select('id', { count: 'exact', head: true }),
          supabaseAdmin.from('audits').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
          supabaseAdmin.from('audits').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
          supabaseAdmin.from('audits').select('id', { count: 'exact', head: true }).eq('status', 'running'),
          supabaseAdmin.from('visibility_scores').select('visibility_score, opportunity_score, mention_frequency'),
        ])

        const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
        const visScores = (scores ?? []).map(s => s.visibility_score).filter(Boolean)
        const oppScores = (scores ?? []).map(s => s.opportunity_score).filter(Boolean)
        const freqs = (scores ?? []).map(s => s.mention_frequency).filter(Boolean)

        return NextResponse.json({
          totalRestaurants,
          totalAudits,
          completedAudits,
          failedAudits,
          runningAudits,
          avgVisibility: Math.round(avg(visScores) * 10) / 10,
          avgOpportunity: Math.round(avg(oppScores) * 10) / 10,
          avgMentionFreq: Math.round(avg(freqs) * 1000) / 10,
          totalScores: scores?.length ?? 0,
          missingScores: (completedAudits ?? 0) - (scores?.length ?? 0),
        })
      }

      // ── Top opportunities (highest opportunity score) ─────────
      case 'top_opportunities': {
        const { data } = await supabaseAdmin
          .from('visibility_scores')
          .select(`
            restaurant_id, visibility_score, opportunity_score,
            estimated_revenue_min, estimated_revenue_max, audit_id,
            restaurant:restaurants(name, city, website, email)
          `)
          .gt('opportunity_score', 0)
          .order('opportunity_score', { ascending: false })
          .limit(20)
        return NextResponse.json({ data: data ?? [] })
      }

      // ── Lowest visibility (most at risk) ──────────────────────
      case 'lowest_visibility': {
        const { data } = await supabaseAdmin
          .from('visibility_scores')
          .select(`
            restaurant_id, visibility_score, mention_frequency,
            model_consensus, audit_id,
            restaurant:restaurants(name, city, cuisine)
          `)
          .order('visibility_score', { ascending: true })
          .limit(20)
        return NextResponse.json({ data: data ?? [] })
      }

      // ── Top competitors mentioned across all audits ───────────
      case 'top_competitors': {
        const { data } = await supabaseAdmin
          .from('competitors')
          .select('name, mention_count, avg_position, sentiment_score, share_of_voice')
          .order('mention_count', { ascending: false })
          .limit(30)

        // Group and aggregate by name across audits
        const grouped: Record<string, { name: string; total_mentions: number; avg_position: number; avg_sentiment: number; appearances: number }> = {}
        for (const c of data ?? []) {
          if (!grouped[c.name]) {
            grouped[c.name] = { name: c.name, total_mentions: 0, avg_position: 0, avg_sentiment: 0, appearances: 0 }
          }
          grouped[c.name].total_mentions += c.mention_count ?? 0
          grouped[c.name].avg_position += c.avg_position ?? 0
          grouped[c.name].avg_sentiment += c.sentiment_score ?? 0
          grouped[c.name].appearances += 1
        }
        const result = Object.values(grouped)
          .map(c => ({
            ...c,
            avg_position: Math.round((c.avg_position / c.appearances) * 10) / 10,
            avg_sentiment: Math.round((c.avg_sentiment / c.appearances) * 100) / 100,
          }))
          .sort((a, b) => b.total_mentions - a.total_mentions)
          .slice(0, 15)

        return NextResponse.json({ data: result })
      }

      // ── Failed audits (need re-running) ───────────────────────
      case 'failed_audits': {
        const { data } = await supabaseAdmin
          .from('audits')
          .select(`
            id, created_at, restaurant_id,
            restaurant:restaurants(name, city, website)
          `)
          .eq('status', 'failed')
          .order('created_at', { ascending: false })
          .limit(50)
        return NextResponse.json({ data: data ?? [] })
      }

      // ── Completed audits missing a visibility score ────────────
      case 'missing_scores': {
        const { data: completed } = await supabaseAdmin
          .from('audits')
          .select('id, restaurant_id, created_at, restaurant:restaurants(name, city)')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })

        const { data: scored } = await supabaseAdmin
          .from('visibility_scores')
          .select('audit_id')

        const scoredIds = new Set((scored ?? []).map(s => s.audit_id))
        const missing = (completed ?? []).filter(a => !scoredIds.has(a.id))

        return NextResponse.json({ data: missing.slice(0, 50) })
      }

      // ── Website signal breakdown ──────────────────────────────
      case 'website_signals': {
        const { data } = await supabaseAdmin
          .from('website_audits')
          .select(`
            schema_present, menu_present, opening_hours_present,
            reservation_links_present, social_links_present, review_count,
            audit:audits(restaurant_id, restaurant:restaurants(name, city))
          `)
          .limit(200)

        const rows = data ?? []
        const total = rows.length
        const pct = (field: 'schema_present' | 'menu_present' | 'opening_hours_present' | 'reservation_links_present' | 'social_links_present') =>
          total ? Math.round((rows.filter(r => r[field]).length / total) * 100) : 0

        return NextResponse.json({
          total,
          schema_pct: pct('schema_present'),
          menu_pct: pct('menu_present'),
          hours_pct: pct('opening_hours_present'),
          reservation_pct: pct('reservation_links_present'),
          social_pct: pct('social_links_present'),
          avg_reviews: total
            ? Math.round(rows.reduce((s, r) => s + (r.review_count ?? 0), 0) / total)
            : 0,
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown query' }, { status: 400 })
    }
  } catch (err: any) {
    console.error('Analytics error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Re-run audit action
export async function POST(request: NextRequest) {
  try {
    const { restaurant_id } = await request.json()

    if (!restaurant_id) {
      return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })
    }

    const auditId = await createAudit(restaurant_id)
    return NextResponse.json({ success: true, audit_id: auditId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
