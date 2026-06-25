/**
 * Turn a stored public audit_request into a real restaurant + queued audit.
 * Shared by the auto-run Inngest function and the manual admin action so both
 * paths behave identically. Detects the business from the website, falling back
 * to whatever the owner submitted.
 */

import { supabaseAdmin } from '@/lib/supabase/client'
import { normalizeCity, domainFromUrl } from '@/lib/engine/normalize'

export interface AuditRequestRow {
  id: string
  website: string
  domain: string | null
  restaurant_name: string | null
  city: string | null
}

export async function createAuditFromRequest(req: AuditRequestRow): Promise<{ auditId: string; restaurantId: string }> {
  const { detectBusiness } = await import('@/lib/engine/business-detector')
  const business = await detectBusiness(req.website).catch(() => null)

  const name = business?.name || req.restaurant_name || req.domain || req.website
  const city = normalizeCity(business?.city || req.city) ?? (business?.city || req.city || 'Unknown')

  const { data: entity, error } = await supabaseAdmin
    .from('restaurants')
    .insert({
      name,
      website:       business?.website || req.website,
      domain:        domainFromUrl(business?.website || req.website) || req.domain,
      city,
      country:       business?.country || 'Netherlands',
      cuisine:       business?.subtypes?.[0] || null,
      business_type: 'restaurant', // restaurant-only product; never store the generic 'other'
      subtypes:      business?.subtypes?.length ? business.subtypes : null,
    })
    .select()
    .single()

  if (error || !entity) throw new Error(error?.message ?? 'Failed to create restaurant')

  const { createAudit } = await import('@/lib/engine/audit-runner')
  const auditId = await createAudit(entity.id)

  await supabaseAdmin
    .from('audit_requests')
    .update({ restaurant_id: entity.id, audit_id: auditId, status: 'audit_created', updated_at: new Date().toISOString() })
    .eq('id', req.id)

  return { auditId, restaurantId: entity.id }
}
