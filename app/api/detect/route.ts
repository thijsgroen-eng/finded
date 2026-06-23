import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { normalizeCity, domainFromUrl } from '@/lib/engine/normalize'

// Dynamic import prevents Next.js from treating engine exports as route exports
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

    const { detectBusiness } = await import('@/lib/engine/business-detector')
    const business = await detectBusiness(url)

    return NextResponse.json({ business })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Create entity + trigger audit in one step
export async function PUT(request: NextRequest) {
  try {
    const { url } = await request.json()
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

    const { detectBusiness } = await import('@/lib/engine/business-detector')
    const business = await detectBusiness(url)

    if (!business.name || !business.city) {
      // Still create with what we have — don't block on low confidence
    }

    // Create entity
    const { data: entity, error } = await supabaseAdmin
      .from('restaurants')
      .insert({
        name:          business.name,
        website:       business.website,
        domain:        domainFromUrl(business.website),
        city:          normalizeCity(business.city) ?? (business.city || 'Unknown'),
        country:       business.country || null,
        cuisine:       business.subtypes[0] || null,
        business_type: business.business_type,
        subtypes:      business.subtypes.length ? business.subtypes : null,
      })
      .select()
      .single()

    if (error || !entity) throw new Error(error?.message ?? 'Failed to create entity')

    // Trigger audit
    const { createAudit } = await import('@/lib/engine/audit-runner')
    const auditId = await createAudit(entity.id)

    return NextResponse.json({
      entity,
      audit_id: auditId,
      business,
    }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
