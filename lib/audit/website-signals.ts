/**
 * Typed website AI-readiness signals.
 *
 * Projects the stored website_audits row into a typed checklist — each signal has
 * a status (present | weak | missing), optional evidence, and the fix type that
 * would address it. Pure + testable. Only emits signals we can actually assess
 * from stored data (no fabricated "missing" for checks we don't run).
 *
 * The underlying scrape (lib/engine/website-auditor) already HTML-entity-decodes
 * metadata, so titles/descriptions here are clean.
 */

import type { FixType } from '@/lib/engine/fix-types'

export type SignalStatus = 'present' | 'weak' | 'missing'

export interface WebsiteSignal {
  key: string
  label: string
  status: SignalStatus
  evidence?: string
  recommendedFixType?: FixType
}

export interface WebsiteAuditRow {
  schema_present?: boolean | null
  schema_types?: string[] | null
  menu_present?: boolean | null
  menu_or_services_present?: boolean | null
  opening_hours_present?: boolean | null
  reservation_links_present?: boolean | null
  booking_present?: boolean | null
  social_links_present?: boolean | null
  contact_present?: boolean | null
  location_present?: boolean | null
  faq_present?: boolean | null
  review_signals?: boolean | null
  review_count?: number | null
  meta_title?: string | null
  meta_description?: string | null
}

const has = (...vals: (boolean | null | undefined)[]) => vals.some(Boolean)

function lengthStatus(text: string | null | undefined, min: number, max: number): SignalStatus {
  if (!text || !text.trim()) return 'missing'
  const n = text.trim().length
  return n >= min && n <= max ? 'present' : 'weak'
}

/** Optional restaurant context lets us check cuisine/location clarity in the copy. */
export interface SignalContext {
  cuisine?: string | null
  city?: string | null
}

/** Does the title/description mention the given term? */
function metaMentions(wa: WebsiteAuditRow, term: string): boolean {
  const hay = `${wa.meta_title ?? ''} ${wa.meta_description ?? ''}`.toLowerCase()
  return hay.includes(term.toLowerCase())
}

/** Build the typed signal checklist. Returns [] when there's no website audit. */
export function toWebsiteSignals(wa: WebsiteAuditRow | null | undefined, ctx?: SignalContext): WebsiteSignal[] {
  if (!wa) return []

  const types = (wa.schema_types ?? []).map((t) => t.toLowerCase())
  const hasRestaurantSchema = types.some((t) => t.includes('restaurant'))
  const hasLocalBusiness = types.some((t) => t.includes('localbusiness'))

  const signals: WebsiteSignal[] = [
    {
      key: 'restaurant_schema',
      label: 'Restaurant schema',
      status: hasRestaurantSchema ? 'present' : wa.schema_present ? 'weak' : 'missing',
      evidence: wa.schema_types?.length ? wa.schema_types.join(', ') : undefined,
      recommendedFixType: 'schema_jsonld',
    },
    {
      key: 'localbusiness_schema',
      label: 'LocalBusiness schema',
      status: hasLocalBusiness ? 'present' : wa.schema_present ? 'weak' : 'missing',
      recommendedFixType: 'schema_jsonld',
    },
    {
      key: 'address',
      label: 'Address / location',
      status: has(wa.location_present, wa.contact_present) ? 'present' : 'missing',
      recommendedFixType: 'location_page',
    },
    {
      key: 'opening_hours',
      label: 'Opening hours',
      status: wa.opening_hours_present ? 'present' : 'missing',
      recommendedFixType: 'opening_hours',
    },
    {
      key: 'reservation_link',
      label: 'Reservation / booking',
      status: has(wa.reservation_links_present, wa.booking_present) ? 'present' : 'missing',
      recommendedFixType: 'reservation_markup',
    },
    {
      key: 'menu_link',
      label: 'Crawlable menu',
      status: has(wa.menu_present, wa.menu_or_services_present) ? 'present' : 'missing',
      recommendedFixType: 'menu_structure',
    },
    {
      key: 'social_links',
      label: 'Social links',
      status: wa.social_links_present ? 'present' : 'missing',
    },
    {
      key: 'faq_content',
      label: 'FAQ content',
      status: wa.faq_present ? 'present' : 'missing',
      recommendedFixType: 'faq_page',
    },
    {
      key: 'reviews',
      label: 'Review / testimonial signals',
      status: has(wa.review_signals) || (wa.review_count ?? 0) > 0 ? 'present' : 'missing',
      evidence: wa.review_count ? `${wa.review_count} detected` : undefined,
      recommendedFixType: 'authority_content',
    },
    {
      key: 'title_quality',
      label: 'Title tag',
      status: lengthStatus(wa.meta_title, 10, 70),
      evidence: wa.meta_title?.trim() || undefined,
      recommendedFixType: 'optimized_description',
    },
    {
      key: 'meta_description_quality',
      label: 'Meta description',
      status: lengthStatus(wa.meta_description, 50, 160),
      evidence: wa.meta_description?.trim() || undefined,
      recommendedFixType: 'optimized_description',
    },
  ]

  // Cuisine / location clarity — can AI instantly tell what & where this is?
  // Only emitted when we know the cuisine/city (otherwise we'd be guessing).
  if (ctx?.cuisine?.trim()) {
    signals.push({
      key: 'cuisine_clarity',
      label: 'Cuisine stated in title/description',
      status: metaMentions(wa, ctx.cuisine.trim()) ? 'present' : 'missing',
      evidence: `Looking for “${ctx.cuisine.trim()}”`,
      recommendedFixType: 'optimized_description',
    })
  }
  if (ctx?.city?.trim()) {
    signals.push({
      key: 'location_clarity',
      label: 'City stated in title/description',
      status: metaMentions(wa, ctx.city.trim()) ? 'present' : 'missing',
      evidence: `Looking for “${ctx.city.trim()}”`,
      recommendedFixType: 'location_page',
    })
  }

  return signals
}

/** Convenience: the signals that need attention (missing or weak). */
export function gapSignals(signals: WebsiteSignal[]): WebsiteSignal[] {
  return signals.filter((s) => s.status !== 'present')
}
