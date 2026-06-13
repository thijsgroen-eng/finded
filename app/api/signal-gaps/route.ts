import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const { restaurant_id } = await request.json()
    if (!restaurant_id) return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })

    const { data: entity } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('id', restaurant_id)
      .single()

    if (!entity) return NextResponse.json({ error: 'Entity not found' }, { status: 404 })

    const { data: latestAudit } = await supabaseAdmin
      .from('audits')
      .select('id')
      .eq('restaurant_id', restaurant_id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let websiteAudit = null
    if (latestAudit) {
      const { data: wa } = await supabaseAdmin
        .from('website_audits')
        .select('schema_present, faq_present, booking_present, contact_present, review_count')
        .eq('audit_id', latestAudit.id)
        .single()
      if (wa) {
        websiteAudit = {
          schema_present:  wa.schema_present,
          faq_present:     (wa as any).faq_present ?? false,
          booking_present: (wa as any).booking_present ?? false,
          contact_present: (wa as any).contact_present ?? false,
          review_count:    wa.review_count,
        }
      }
    }

    // Dynamic import prevents Next.js from treating engine exports as route exports
    const { detectSignalGaps } = await import('@/lib/engine/signal-gap-engine')
    const report = await detectSignalGaps(
      entity.name,
      entity.business_type ?? 'restaurant',
      entity.city,
      websiteAudit
    )

    await supabaseAdmin
      .from('signal_gaps')
      .delete()
      .eq('restaurant_id', restaurant_id)

    if (report.gaps.length > 0) {
      await supabaseAdmin.from('signal_gaps').insert(
        report.gaps.map(gap => ({
          restaurant_id,
          gap_type:         gap.type,
          severity:         gap.severity,
          title:            gap.title,
          explanation:      gap.explanation,
          evidence:         gap.evidence,
          benchmark:        gap.benchmark,
          affected_intents: gap.affected_intents,
          fix_available:    gap.fix_available,
          fix_type:         gap.fix_type ?? null,
          expected_impact:  gap.expected_impact,
        }))
      )
    }

    await supabaseAdmin.from('signal_snapshots').upsert({
      restaurant_id,
      overall_score:            report.overall_signal_score,
      recommendation_readiness: report.recommendation_readiness,
      wikipedia_found:          report.signals.wikipedia_found,
      directory_coverage:       report.signals.directory_coverage_score,
      review_platforms:         report.signals.review_platforms_present,
      total_external_reviews:   report.signals.total_external_reviews,
      reddit_found:             report.signals.reddit_discussions_found,
      gaps_critical:            report.gaps.filter(g => g.severity === 'critical').length,
      gaps_high:                report.gaps.filter(g => g.severity === 'high').length,
      gaps_medium:              report.gaps.filter(g => g.severity === 'medium').length,
      snapshot_date:            new Date().toISOString().split('T')[0],
    }, { onConflict: 'restaurant_id,snapshot_date' })

    return NextResponse.json({ report })
  } catch (err: any) {
    console.error('Signal gap detection error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const restaurant_id = searchParams.get('restaurant_id')
  if (!restaurant_id) return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })

  const { data: gaps } = await supabaseAdmin
    .from('signal_gaps')
    .select('*')
    .eq('restaurant_id', restaurant_id)
    .order('severity')

  const { data: snapshot } = await supabaseAdmin
    .from('signal_snapshots')
    .select('*')
    .eq('restaurant_id', restaurant_id)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({ gaps: gaps ?? [], snapshot })
}
