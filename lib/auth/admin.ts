/**
 * Minimal admin authentication.
 *
 * The whole /admin surface (and the admin-only API routes) is gated by a single
 * shared password set in ADMIN_PASSWORD. A successful login sets an httpOnly
 * cookie whose value is HMAC-SHA256(ADMIN_PASSWORD, fixed-payload) — a
 * deterministic bearer derived from the password, so the gate is stateless (no
 * session store) and verifiable from edge middleware via Web Crypto.
 *
 * Fail-closed in production: if ADMIN_PASSWORD is unset, admin access is denied
 * rather than silently public (mirrors lib/auth/cron.ts). In development it is
 * allowed through for convenience.
 *
 * This is a deliberately minimal gate for a solo/small-team internal tool: the
 * token does not rotate or expire on its own. Rotate it by changing
 * ADMIN_PASSWORD. For per-user accounts, swap this for Supabase Auth later.
 */

export const ADMIN_COOKIE = 'finded_admin'
const SESSION_PAYLOAD = 'finded-admin-session-v1'

const enc = new TextEncoder()

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  // base64url, no padding — cookie-safe.
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Constant-time string compare (avoids leaking length/position via timing). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * The configured admin password, trimmed. Leading/trailing whitespace is a
 * common footgun when pasting the value into a hosting dashboard (a trailing
 * newline makes every login fail with "incorrect password"), so we normalize it
 * here. Returns '' when unset/blank.
 */
function adminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() ?? ''
}

/** The cookie value a valid session must carry, or null if admin auth is unconfigured. */
export async function expectedToken(): Promise<string | null> {
  const pw = adminPassword()
  if (!pw) return null
  return hmac(pw, SESSION_PAYLOAD)
}

/** Whether a submitted password matches ADMIN_PASSWORD (constant-time, whitespace-trimmed). */
export function passwordMatches(submitted: string): boolean {
  const pw = adminPassword()
  if (!pw) return false
  return safeEqual(submitted.trim(), pw)
}

/** Whether a cookie value represents a valid admin session. */
export async function isValidSession(cookieValue: string | undefined | null): Promise<boolean> {
  if (!cookieValue) return false
  const expected = await expectedToken()
  if (!expected) return false
  return safeEqual(cookieValue, expected)
}

/** True when no ADMIN_PASSWORD is set AND we are not in production (dev bypass). */
export function adminAuthDisabledInDev(): boolean {
  return !adminPassword() && process.env.NODE_ENV !== 'production'
}
