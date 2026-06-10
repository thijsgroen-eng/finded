export interface WebsiteAuditResult {
  schema_present: boolean
  menu_present: boolean
  opening_hours_present: boolean
  reservation_links_present: boolean
  social_links_present: boolean
  review_count: number | null
  meta_title: string | null
  meta_description: string | null
  raw_html_snippet: string | null
  error: string | null
}

const RESERVATION_PLATFORMS = [
  'opentable', 'resy', 'sevenrooms', 'yelp', 'tripadvisor',
  'quandoo', 'fork', 'thefork', 'bookatable', 'zenchef', 'formitable',
]

const SOCIAL_PLATFORMS = [
  'instagram.com', 'facebook.com', 'twitter.com', 'x.com', 'tiktok.com',
]

const MENU_SIGNALS = [
  '/menu', '/menus', '/food', '/dishes', '/carte',
  'our-menu', 'our menu', 'food menu', 'view menu',
]

const HOURS_SIGNALS = [
  'opening hours', 'opening times', 'hours of operation',
  'we are open', 'monday', 'tuesday', 'wed-', 'mon-', 'tue-',
  'ouverture', 'horaires', 'öffnungszeiten',
]

/**
 * Fetch and audit a restaurant website.
 * Detects structured data, menu presence, hours, reservations, socials.
 */
export async function auditWebsite(url: string): Promise<WebsiteAuditResult> {
  const result: WebsiteAuditResult = {
    schema_present: false,
    menu_present: false,
    opening_hours_present: false,
    reservation_links_present: false,
    social_links_present: false,
    review_count: null,
    meta_title: null,
    meta_description: null,
    raw_html_snippet: null,
    error: null,
  }

  if (!url) {
    result.error = 'No website URL provided'
    return result
  }

  // Normalise URL
  let parsedUrl: URL
  try {
    const withProtocol = url.startsWith('http') ? url : `https://${url}`
    parsedUrl = new URL(withProtocol)
  } catch {
    result.error = `Invalid URL: ${url}`
    return result
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const response = await fetch(parsedUrl.href, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; FindedBot/1.0; +https://finded.co/bot)',
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

    // Store a small snippet for debugging
    result.raw_html_snippet = html.slice(0, 2000)

    // Meta tags
    result.meta_title = extractMeta(html, 'title')
    result.meta_description = extractMeta(html, 'description')

    // Schema.org structured data
    result.schema_present =
      lower.includes('"@type"') &&
      (lower.includes('"restaurant"') ||
        lower.includes('"foodestablishment"') ||
        lower.includes('"localbusiness"'))

    // Menu
    result.menu_present =
      MENU_SIGNALS.some((s) => lower.includes(s)) ||
      lower.includes('type="menu"') ||
      lower.includes('itemtype="http://schema.org/menu"')

    // Opening hours
    result.opening_hours_present =
      HOURS_SIGNALS.some((s) => lower.includes(s)) ||
      lower.includes('openinghours') ||
      lower.includes('opening_hours')

    // Reservation links
    result.reservation_links_present =
      RESERVATION_PLATFORMS.some((p) => lower.includes(p)) ||
      lower.includes('reserve') ||
      lower.includes('reservation') ||
      lower.includes('book a table') ||
      lower.includes('boek een tafel')

    // Social links
    result.social_links_present = SOCIAL_PLATFORMS.some((p) => lower.includes(p))

    // Review count: look for common patterns like "4.5 (123 reviews)"
    const reviewMatch = html.match(/(\d{1,5})\s*(?:reviews?|beoordelingen|avis|bewertungen)/i)
    if (reviewMatch) {
      result.review_count = parseInt(reviewMatch[1], 10)
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
    return match ? match[1].trim() : null
  }
  const match = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,300})["']/i
  ) || html.match(
    /<meta[^>]+content=["']([^"']{1,300})["'][^>]+name=["']description["']/i
  )
  return match ? match[1].trim() : null
}
