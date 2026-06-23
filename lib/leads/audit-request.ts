/**
 * Validation + sanitization for the public audit-request funnel (/audit →
 * POST /api/audit-request). Pure and dependency-light (only the existing
 * domain helper) so the SAME rules run client-side for instant feedback and
 * server-side as the source of truth. No server-only imports → safe in the
 * browser bundle.
 */

import { domainFromUrl } from '@/lib/engine/normalize'

export interface AuditRequestInput {
  website?: string
  restaurant_name?: string
  city?: string
  email?: string
  phone?: string
  note?: string
  /** Honeypot — real users never fill this; bots often do. */
  company?: string
}

export interface CleanedAuditRequest {
  website: string
  domain: string | null
  restaurant_name: string | null
  city: string | null
  email: string
  phone: string | null
  note: string | null
}

export interface ValidationResult {
  ok: boolean
  errors: Partial<Record<keyof AuditRequestInput, string>>
  cleaned?: CleanedAuditRequest
  /** Honeypot tripped — caller should accept silently without storing. */
  spam?: boolean
}

export const LIMITS = {
  name: 120,
  city: 80,
  email: 254,
  phone: 40,
  note: 1000,
  website: 2048,
} as const

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isValidEmail(email: string): boolean {
  const e = email.trim()
  return e.length <= LIMITS.email && EMAIL_RE.test(e)
}

/** Ensure a protocol so bare domains ("dekas.nl") validate + store consistently. */
export function normalizeWebsite(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  return /^https?:\/\//i.test(t) ? t : `https://${t}`
}

/** A website is valid if it parses to a real domain with a dot (not "localhost"). */
export function isValidWebsite(raw: string): boolean {
  const url = normalizeWebsite(raw)
  if (!url || url.length > LIMITS.website) return false
  const domain = domainFromUrl(url)
  return !!domain && domain.includes('.')
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const nullable = (v: string): string | null => (v ? v : null)

/**
 * Validate + sanitize a public submission. Returns field-level errors (safe to
 * show the user) and, on success, the cleaned payload to persist.
 */
export function validateAuditRequest(input: AuditRequestInput): ValidationResult {
  // Honeypot: if filled, treat as spam — accept silently, store nothing.
  if (str(input.company)) return { ok: false, errors: {}, spam: true }

  const errors: ValidationResult['errors'] = {}

  const website = str(input.website)
  const email = str(input.email)
  const name = str(input.restaurant_name)
  const city = str(input.city)
  const phone = str(input.phone)
  const note = str(input.note)

  if (!website) errors.website = 'Enter your restaurant website.'
  else if (!isValidWebsite(website)) errors.website = 'Enter a valid website (e.g. restaurant.nl).'

  if (!email) errors.email = 'Enter an email so we can send the results.'
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address.'

  if (name.length > LIMITS.name) errors.restaurant_name = `Keep the name under ${LIMITS.name} characters.`
  if (city.length > LIMITS.city) errors.city = `Keep the city under ${LIMITS.city} characters.`
  if (phone.length > LIMITS.phone) errors.phone = `Keep the phone under ${LIMITS.phone} characters.`
  if (note.length > LIMITS.note) errors.note = `Keep the message under ${LIMITS.note} characters.`

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    errors: {},
    cleaned: {
      website: normalizeWebsite(website),
      domain: domainFromUrl(website),
      restaurant_name: nullable(name),
      city: nullable(city),
      email: email.toLowerCase(),
      phone: nullable(phone),
      note: nullable(note),
    },
  }
}
