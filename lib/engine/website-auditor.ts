/**
 * Universal Website Auditor
 * Works for any business type — restaurants, dentists, lawyers, hotels, agencies, etc.
 * Detects structured data, contact signals, content signals, and social presence.
 */

import { assertPublicHttpUrl } from './url-guard'
import { decodeHtmlEntities } from './html'
import { analyzeMenu, analyzeDietary, type MenuFormat, type MenuRichness } from '@/lib/audit/menu-dietary'

export interface WebsiteAuditResult {
  // Universal signals
  schema_present: boolean
  schema_types: string[]          // detected @type values e.g. ["Restaurant", "LocalBusiness"]
  contact_present: boolean        // phone or email on page
  hours_present: boolean          // opening/business hours
  location_present: boolean       // address or map embed
  social_links_present: boolean
  review_signals: boolean         // review count or rating present
  review_count: number | null
  booking_present: boolean        // any booking/appointment/reservation link

  // Content signals
  faq_present: boolean
  menu_or_services_present: boolean  // menu (restaurant) or services list (others)

  // Menu & dietary discoverability
  menu_format: MenuFormat            // how readable the menu is to AI
  menu_richness: MenuRichness        // how descriptive the menu text is
  dietary: string[]                  // dietary signals exposed (e.g. ["Vegan"])

  // Meta
  meta_title: string | null
  meta_description: string | null
  raw_html_snippet: string | null
  error: string | null
}

// ── Platform & signal lists ────────────────────────────────────────────────────

const SOCIAL_PLATFORMS = [
  'instagram.com', 'facebook.com', 'twitter.com', 'x.com',
  'tiktok.com', 'linkedin.com', 'youtube.com',
]

// Booking signals across all business types
const BOOKING_SIGNALS = [
  // Restaurant
  'opentable', 'resy', 'thefork', 'zenchef', 'quandoo', 'formitable',
  'book a table', 'boek een tafel', 'reserve a table',
  // Medical / wellness
  'zocdoc', 'doctolib', 'book appointment', 'schedule appointment',
  'request appointment', 'book consultation',
  // General
  'calendly', 'acuity', 'booksy', 'fresha', 'treatwell',
  'book now', 'boek nu', 'reserve', 'reservation',
  'make an appointment', 'get a quote',
]

const HOURS_SIGNALS = [
  'opening hours', 'opening times', 'business hours', 'hours of operation',
  'we are open', 'openingsuren', 'openingstijden', 'horaires',
  'öffnungszeiten', 'monday', 'tuesday', 'maandag', 'lundi',
  'mon-', 'tue-', 'wed-', 'openinghours', 'opening_hours',
]

const LOCATION_SIGNALS = [
  'google.com/maps', 'maps.google', 'goo.gl/maps',
  'openstreetmap', 'maps.apple',
  'address', 'straat', 'street', 'avenue', 'boulevard',
  'postcode', 'zip code', 'postal',
  'directions', 'find us', 'how to find', 'where to find',
]

const FAQ_SIGNALS = [
  'faq', 'frequently asked', 'veelgestelde vragen',
  'questions', 'vraag en antwoord', 'q&a',
  'itemtype="https://schema.org/faqpage"',
  '"@type":"faqpage"', '"@type": "faqpage"',
]

const SERVICE_SIGNALS = [
  // Restaurant
  '/menu', 'our menu', 'view menu', 'food menu', 'drinks menu',
  'type="menu"', 'schema.org/menu',
  // Services (all business types)
  '/services', '/treatments', '/procedures', '/specialties',
  'our services', 'what we offer', 'what we do',
  'practice areas', 'areas of law',
  'treatments', 'procedures',
]

// Schema.org types to detect (expanded beyond just restaurant)
const SCHEMA_TYPES = [
  'restaurant', 'foodestablishment', 'cafeteria', 'bakery', 'bar',
  'localbusiness', 'medicalorganization', 'dentist', 'physician',
  'legalservice', 'attorney', 'lawyer',
  'lodgingbusiness', 'hotel', 'motel', 'hostel',
  'professionalservice', 'financialservice', 'accountingservice',
  'realestatebusiness', 'store', 'clothingstore',
  'automotivebusiness', 'beautysalon', 'fitnessclub', 'gym',
  'organization', 'corporation',
]

// ── Main function ──────────────────────────────────────────────────────────────

export async function auditWebsite(url: string): Promise<WebsiteAuditResult> {
  const result: WebsiteAuditResult = {
    schema_present: false,
    schema_types: [],
    contact_present: false,
    hours_present: false,
    location_present: false,
    social_links_present: false,
    review_signals: false,
    review_count: null,
    booking_present: false,
    faq_present: false,
    menu_or_services_present: false,
    menu_format: 'none',
    menu_richness: 'none',
    dietary: [],
    meta_title: null,
    meta_description: null,
    raw_html_snippet: null,
    error: null,
  }

  if (!url) {
    result.error = 'No website URL provided'
    return result
  }

  let parsedUrl: URL
  try {
    parsedUrl = assertPublicHttpUrl(url)
  } catch (e) {
    result.error = e instanceof Error ? e.message : `Invalid URL: ${url}`
    return result
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const response = await fetch(parsedUrl.href, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FindedBot/1.0; +https://finded.co/bot)',
        Accept: 'text/html',
      },
    })

    clearTimeout(timeout)

    if (!response.ok) {
      result.error = `HTTP ${response.status}`
      return result
    }

    const html = await response.text()
    const lower = html.toLowerCase()

    result.raw_html_snippet = html.slice(0, 2000)
    result.meta_title = extractMeta(html, 'title')
    result.meta_description = extractMeta(html, 'description')

    // Schema.org — detect type
    if (lower.includes('"@type"')) {
      result.schema_present = true
      result.schema_types = SCHEMA_TYPES.filter(t =>
        lower.includes(`"${t}"`) || lower.includes(`"${t.charAt(0).toUpperCase() + t.slice(1)}"`)
      )
      // Also accept any @type as valid schema even if unknown type
      if (result.schema_types.length === 0 && lower.includes('"@type"')) {
        result.schema_types = ['unknown']
      }
    }

    // Contact — phone or email
    result.contact_present =
      /tel:|phone|telefoon|telefon|téléphone|\+\d{1,3}[\s\-]\d/.test(lower) ||
      /mailto:|email|e-mail/.test(lower)

    // Hours
    result.hours_present = HOURS_SIGNALS.some(s => lower.includes(s))

    // Location / map
    result.location_present = LOCATION_SIGNALS.some(s => lower.includes(s))

    // Social
    result.social_links_present = SOCIAL_PLATFORMS.some(p => lower.includes(p))

    // Booking / appointments
    result.booking_present = BOOKING_SIGNALS.some(s => lower.includes(s))

    // FAQ
    result.faq_present = FAQ_SIGNALS.some(s => lower.includes(s))

    // Menu / services
    result.menu_or_services_present = SERVICE_SIGNALS.some(s => lower.includes(s))

    // Menu discoverability (format + entity richness) + dietary signals
    const menu = analyzeMenu(html)
    result.menu_format = menu.format
    result.menu_richness = menu.richness
    result.dietary = analyzeDietary(html).detected

    // Reviews
    const reviewMatch = html.match(
      /(\d{1,5})\s*(?:reviews?|beoordelingen|avis|bewertungen|ratings?)/i
    )
    if (reviewMatch) {
      result.review_count = parseInt(reviewMatch[1], 10)
      result.review_signals = true
    }

    // Also catch star ratings as review signals even without count
    if (!result.review_signals) {
      result.review_signals =
        lower.includes('rating') ||
        lower.includes('sterren') ||
        lower.includes('étoiles') ||
        /\d+\.\d+\s*\/\s*5/.test(lower)
    }

    return result
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Fetch failed'
    return result
  }
}

function extractMeta(html: string, type: 'title' | 'description'): string | null {
  if (type === 'title') {
    const match = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)
    return match ? decodeHtmlEntities(match[1].trim()) : null
  }
  const match =
    html.match(/<meta[^>]+name=[\"']description[\"'][^>]+content=[\"']([^\"']{1,300})[\"']/i) ||
    html.match(/<meta[^>]+content=[\"']([^\"']{1,300})[\"'][^>]+name=[\"']description[\"']/i)
  return match ? decodeHtmlEntities(match[1].trim()) : null
}
