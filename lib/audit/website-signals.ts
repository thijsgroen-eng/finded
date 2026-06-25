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

export type SignalImpact = 'High' | 'Medium' | 'Low'

export interface WebsiteSignal {
  key: string
  label: string
  status: SignalStatus
  evidence?: string
  recommendedFixType?: FixType
  /** Why this signal matters for AI visibility (insight framing). */
  why?: string
  /** Likely impact if missing/weak. */
  impact?: SignalImpact
  /** Concrete next step. */
  recommendation?: string
}

const SIGNAL_META: Record<string, { why: string; impact: SignalImpact; recommendation: string }> = {
  restaurant_schema: { why: 'Restaurant schema lets AI read your cuisine, location and hours directly instead of guessing.', impact: 'High', recommendation: 'Add Restaurant JSON-LD with servesCuisine, address and openingHours.' },
  localbusiness_schema: { why: 'LocalBusiness schema reinforces who and where you are for local queries.', impact: 'Medium', recommendation: 'Add LocalBusiness (or Restaurant) JSON-LD with full NAP details.' },
  address: { why: 'A clear, crawlable address ties you to the city AI is asked about.', impact: 'High', recommendation: 'Show your full address as text (not only in an image/map).' },
  opening_hours: { why: 'Opening hours are a core fact AI uses to decide if it can recommend you.', impact: 'Medium', recommendation: 'Publish opening hours as text and in openingHoursSpecification.' },
  reservation_link: { why: 'A booking link signals an active, bookable restaurant.', impact: 'Medium', recommendation: 'Add a clear reservation/booking link (TheFork, your own, etc.).' },
  menu_link: { why: 'A crawlable menu is how AI learns your dishes and cuisine.', impact: 'High', recommendation: 'Publish the menu as real text/HTML, not a PDF or image.' },
  social_links: { why: 'Social profiles add corroborating signals about your restaurant.', impact: 'Low', recommendation: 'Link your Instagram/Facebook from the site.' },
  faq_content: { why: 'Restaurants AI recommends often answer common diner questions in an FAQ.', impact: 'Medium', recommendation: 'Add an FAQ covering reservations, dietary options, parking and private dining.' },
  reviews: { why: 'Review signals are a strong trust cue AI looks for.', impact: 'Medium', recommendation: 'Surface review counts/ratings and link to your review profiles.' },
  title_quality: { why: 'The title is the first thing AI reads — it should state who and where you are.', impact: 'Medium', recommendation: 'Use a title like “{Name} — {cuisine} restaurant in {city}”.' },
  meta_description_quality: { why: 'A clear meta description helps AI summarise what you offer.', impact: 'Low', recommendation: 'Write a 50–160 char description naming cuisine, city and what makes you distinct.' },
  menu_detail: { why: 'Descriptive dishes (ingredients, preparation) give AI entities to match to cuisine searches.', impact: 'Medium', recommendation: 'Write dishes as “homemade truffle pasta with pecorino”, not just “pasta”.' },
  dietary_info: { why: 'Diners search AI for vegan/vegetarian/gluten-free/halal options — AI can only surface what you state.', impact: 'Medium', recommendation: 'State dietary options (vegan, vegetarian, gluten-free, halal) and allergen info in text.' },
  cuisine_clarity: { why: 'If your cuisine isn’t stated plainly, AI can’t match you to cuisine searches.', impact: 'High', recommendation: 'State your cuisine in the title, description and homepage copy.' },
  location_clarity: { why: 'If your city isn’t stated plainly, AI can’t match you to local searches.', impact: 'High', recommendation: 'State your city (and neighbourhood) in the title, description and copy.' },
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
  menu_format?: string | null      // html | pdf | image | none
  menu_richness?: string | null    // strong | weak | none
  dietary?: string[] | null
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
      status: wa.menu_format
        ? (wa.menu_format === 'html' ? 'present' : wa.menu_format === 'none' ? 'missing' : 'weak')
        : (has(wa.menu_present, wa.menu_or_services_present) ? 'present' : 'missing'),
      evidence: wa.menu_format && wa.menu_format !== 'none' ? `${wa.menu_format} menu` : undefined,
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

  // Menu entity-richness — only when a menu exists.
  if (wa.menu_format && wa.menu_format !== 'none') {
    signals.push({
      key: 'menu_detail',
      label: 'Menu detail (entity-rich)',
      status: wa.menu_richness === 'strong' ? 'present' : 'weak',
      evidence: 'e.g. “homemade truffle pasta with pecorino” reads better than “pasta”',
      recommendedFixType: 'menu_structure',
    })
  }

  // Dietary signals (vegan/vegetarian/gluten-free/halal/allergens).
  signals.push({
    key: 'dietary_info',
    label: 'Dietary options stated',
    status: (wa.dietary?.length ?? 0) > 0 ? 'present' : 'missing',
    evidence: wa.dietary?.length ? wa.dietary.join(', ') : undefined,
    recommendedFixType: 'faq_page',
  })

  // Attach insight metadata (why it matters / impact / recommendation).
  return signals.map((s) => ({ ...s, ...(SIGNAL_META[s.key] ?? {}) }))
}

/** Convenience: the signals that need attention (missing or weak). */
export function gapSignals(signals: WebsiteSignal[]): WebsiteSignal[] {
  return signals.filter((s) => s.status !== 'present')
}
