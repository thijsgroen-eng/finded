/**
 * Business Detector
 * Crawls a website and uses Claude to determine business type,
 * name, location, and specialties — no manual input required.
 */

import Anthropic from '@anthropic-ai/sdk'
import { assertPublicHttpUrl } from './url-guard'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface DetectedBusiness {
  name: string
  business_type: string       // restaurant, dentist, lawyer, hotel, agency, saas, ecommerce, other
  subtypes: string[]          // specialties e.g. ['seafood', 'fine dining'] or ['implants']
  city: string
  country: string
  website: string
  description: string         // one-line description
  confidence: number          // 0-1
  wordpress_detected: boolean // true if site runs WordPress
  cms: string | null          // wordpress, webflow, shopify, wix, squarespace, custom, null
}

const BUSINESS_TYPES = [
  'restaurant', 'cafe', 'bar', 'hotel', 'dentist', 'doctor', 'clinic',
  'lawyer', 'law firm', 'accountant', 'agency', 'marketing agency',
  'saas', 'software', 'ecommerce', 'retail', 'gym', 'salon', 'spa',
  'real estate', 'consultant', 'other'
]

function detectCMS(html: string): { cms: string | null; isWordPress: boolean } {
  const lower = html.toLowerCase()

  if (
    lower.includes('wp-content') ||
    lower.includes('wp-includes') ||
    lower.includes('/wp-json') ||
    lower.includes('wordpress')
  ) return { cms: 'wordpress', isWordPress: true }

  if (lower.includes('webflow')) return { cms: 'webflow', isWordPress: false }
  if (lower.includes('shopify') || lower.includes('myshopify')) return { cms: 'shopify', isWordPress: false }
  if (lower.includes('wix.com') || lower.includes('wixsite')) return { cms: 'wix', isWordPress: false }
  if (lower.includes('squarespace')) return { cms: 'squarespace', isWordPress: false }
  if (lower.includes('ghost.io') || lower.includes('ghost/')) return { cms: 'ghost', isWordPress: false }

  return { cms: null, isWordPress: false }
}

function extractText(html: string): string {
  // Strip scripts, styles, nav, footer
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return text.slice(0, 3000)
}

function extractMeta(html: string): { title: string | null; description: string | null } {
  const titleMatch = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)
  const descMatch =
    html.match(/<meta[^>]+name=[\"']description[\"'][^>]+content=[\"']([^\"']{1,300})[\"']/i) ||
    html.match(/<meta[^>]+content=[\"']([^\"']{1,300})[\"'][^>]+name=[\"']description[\"']/i)

  return {
    title: titleMatch ? titleMatch[1].trim() : null,
    description: descMatch ? descMatch[1].trim() : null,
  }
}

export async function detectBusiness(url: string): Promise<DetectedBusiness> {
  // Validate before fetching to avoid SSRF against internal/reserved hosts.
  // If invalid, skip the fetch and let Claude classify from the URL alone.
  let safeUrl: URL | null = null
  try {
    safeUrl = assertPublicHttpUrl(url)
  } catch {
    safeUrl = null
  }
  const normalizedUrl = safeUrl?.href ?? (url.startsWith('http') ? url : `https://${url}`)

  // Fetch the website
  let html = ''
  if (safeUrl) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const res = await fetch(safeUrl.href, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FindedBot/1.0)',
          'Accept': 'text/html',
        },
      })
      clearTimeout(timeout)
      if (res.ok) html = await res.text()
    } catch {
      // Continue with empty html — Claude will still try to classify from URL
    }
  }

  const meta = extractMeta(html)
  const bodyText = extractText(html)
  const { cms, isWordPress } = detectCMS(html)

  // Ask Claude to classify the business
  const prompt = `Analyze this website and extract structured business information.

URL: ${normalizedUrl}
Page title: ${meta.title ?? 'not found'}
Meta description: ${meta.description ?? 'not found'}
Page content (first 2000 chars): ${bodyText.slice(0, 2000)}

Return a JSON object with exactly these fields:
{
  "name": "exact business name",
  "business_type": "one of: ${BUSINESS_TYPES.join(', ')}",
  "subtypes": ["array of 1-3 specialties e.g. seafood, fine dining OR implants, whitening"],
  "city": "city name or empty string",
  "country": "country name or empty string",
  "description": "one sentence describing what this business does",
  "confidence": 0.0 to 1.0
}

Rules:
- Use the most specific business_type that fits
- For restaurants: subtypes = cuisine types and dining styles
- For lawyers: subtypes = practice areas
- For dentists: subtypes = treatments offered
- For agencies: subtypes = services offered
- If uncertain about city/country, use empty string
- Return ONLY the JSON object, no other text`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0]?.type === 'text' ? message.content[0].text : '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return {
      name:               parsed.name ?? extractDomainName(normalizedUrl),
      business_type:      normalizeType(parsed.business_type ?? 'other'),
      subtypes:           Array.isArray(parsed.subtypes) ? parsed.subtypes.slice(0, 3) : [],
      city:               parsed.city ?? '',
      country:            parsed.country ?? '',
      website:            normalizedUrl,
      description:        parsed.description ?? '',
      confidence:         Math.min(1, Math.max(0, parsed.confidence ?? 0.5)),
      wordpress_detected: isWordPress,
      cms,
    }
  } catch {
    return {
      name:               extractDomainName(normalizedUrl),
      business_type:      'other',
      subtypes:           [],
      city:               '',
      country:            '',
      website:            normalizedUrl,
      description:        '',
      confidence:         0.2,
      wordpress_detected: isWordPress,
      cms,
    }
  }
}

function normalizeType(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('restaurant') || lower.includes('cafe') || lower.includes('bar') || lower.includes('bistro')) return 'restaurant'
  if (lower.includes('hotel') || lower.includes('hostel') || lower.includes('bnb')) return 'hotel'
  if (lower.includes('dentist')) return 'dentist'
  if (lower.includes('doctor') || lower.includes('clinic') || lower.includes('medical')) return 'clinic'
  if (lower.includes('lawyer') || lower.includes('law') || lower.includes('attorney') || lower.includes('solicitor')) return 'lawyer'
  if (lower.includes('agency') || lower.includes('marketing')) return 'agency'
  if (lower.includes('saas') || lower.includes('software')) return 'saas'
  if (lower.includes('ecommerce') || lower.includes('shop') || lower.includes('retail') || lower.includes('store')) return 'ecommerce'
  if (lower.includes('gym') || lower.includes('fitness')) return 'gym'
  if (lower.includes('salon') || lower.includes('spa') || lower.includes('beauty')) return 'salon'
  return lower.split(' ')[0] || 'other'
}

function extractDomainName(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)
  } catch {
    return 'Unknown Business'
  }
}
