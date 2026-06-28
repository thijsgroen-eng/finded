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

// ── Roles (#9) ──────────────────────────────────────────────────
export type Role = 'admin' | 'operator' | 'viewer'
const ROLE_RANK: Record<Role, number> = { viewer: 1, operator: 2, admin: 3 }
export function normRole(v: unknown): Role {
  return v === 'admin' || v === 'operator' || v === 'viewer' ? v : 'operator'
}
/** True when `role` is at least `min` in privilege. */
export function roleAtLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min]
}

export interface Session {
  uid: string | null   // null = shared-password (bootstrap) session
  email: string
  role: Role
}

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

// ── Signed per-user session tokens (#9) ─────────────────────────
// Format: `<payloadB64url>.<hmac>`. Stateless and edge-verifiable (Web Crypto),
// exactly like the legacy token, but the payload carries the user id, email and
// role. Signed with AUTH_SECRET, falling back to ADMIN_PASSWORD so per-user login
// works with no new env. The legacy shared-password token still validates, so
// existing sessions and the bootstrap password are never broken.

function authSecret(): string {
  return process.env.AUTH_SECRET?.trim() || adminPassword()
}

function b64urlFromString(s: string): string {
  let bin = ''
  for (const b of enc.encode(s)) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function stringFromB64url(s: string): string {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

/** Mint a signed session token for a user (null if no signing secret configured). */
export async function createSessionToken(s: Session): Promise<string | null> {
  const secret = authSecret()
  if (!secret) return null
  const payload = b64urlFromString(JSON.stringify({ uid: s.uid, email: s.email, role: s.role, k: 'u' }))
  const sig = await hmac(secret, payload)
  return `${payload}.${sig}`
}

/** Resolve a cookie to a session (signed user token OR legacy shared token). */
export async function readSession(cookieValue: string | undefined | null): Promise<Session | null> {
  if (!cookieValue) return null

  if (cookieValue.includes('.')) {
    const secret = authSecret()
    if (!secret) return null
    const [payload, sig] = cookieValue.split('.')
    if (!payload || !sig) return null
    const expected = await hmac(secret, payload)
    if (!safeEqual(sig, expected)) return null
    try {
      const o = JSON.parse(stringFromB64url(payload))
      if (o.k !== 'u' || typeof o.email !== 'string') return null
      return { uid: o.uid ?? null, email: o.email, role: normRole(o.role) }
    } catch { return null }
  }

  // Legacy shared-password token → a bootstrap admin session.
  const expected = await expectedToken()
  if (expected && safeEqual(cookieValue, expected)) return { uid: null, email: 'shared', role: 'admin' }
  return null
}

/** Whether a cookie value represents a valid admin session (legacy or signed). */
export async function isValidSession(cookieValue: string | undefined | null): Promise<boolean> {
  return (await readSession(cookieValue)) !== null
}

// ── Password hashing for per-user accounts (PBKDF2 via Web Crypto) ───────────
const PBKDF2_ITERATIONS = 100_000

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password) as BufferSource, 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' }, key, 256)
  return new Uint8Array(bits)
}
function b64FromBytes(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}
function bytesFromB64(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Hash a password as `pbkdf2$iterations$saltB64$hashB64`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64FromBytes(salt)}$${b64FromBytes(hash)}`
}

/** Verify a password against a stored `pbkdf2$...` hash (constant-time). */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const iterations = Number(parts[1])
  if (!Number.isFinite(iterations) || iterations < 1) return false
  const hash = await pbkdf2(password, bytesFromB64(parts[2]), iterations)
  return safeEqual(b64FromBytes(hash), parts[3])
}

/** True when no ADMIN_PASSWORD is set AND we are not in production (dev bypass). */
export function adminAuthDisabledInDev(): boolean {
  return !adminPassword() && process.env.NODE_ENV !== 'production'
}
