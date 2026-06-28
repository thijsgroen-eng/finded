import { supabaseAdmin } from '@/lib/supabase/client'

/**
 * Customer portal auth (passwordless magic link) — restaurant owners, NOT staff.
 *
 * Flow: request → a one-time token is emailed → verify exchanges it for a signed
 * `finded_customer` session cookie carrying { cid, email }. The cookie is a
 * stateless HMAC (same approach as admin sessions) so it needs no session store.
 * Signed with AUTH_SECRET, falling back to ADMIN_PASSWORD.
 */

export const CUSTOMER_COOKIE = 'finded_customer'
const TOKEN_TTL_MIN = 30
const SESSION_DAYS = 30
const enc = new TextEncoder()

function secret(): string {
  return process.env.AUTH_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim() || ''
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', enc.encode(s))
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
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

export interface CustomerSession { cid: string; email: string }

export async function createCustomerSession(s: CustomerSession): Promise<string | null> {
  if (!secret()) return null
  const payload = b64urlFromString(JSON.stringify({ cid: s.cid, email: s.email, k: 'c' }))
  return `${payload}.${await hmac(payload)}`
}

export async function readCustomerSession(cookie: string | undefined | null): Promise<CustomerSession | null> {
  if (!cookie || !cookie.includes('.') || !secret()) return null
  const [payload, sig] = cookie.split('.')
  if (!payload || !sig) return null
  if (!safeEqual(sig, await hmac(payload))) return null
  try {
    const o = JSON.parse(stringFromB64url(payload))
    if (o.k !== 'c' || typeof o.cid !== 'string' || typeof o.email !== 'string') return null
    return { cid: o.cid, email: o.email }
  } catch { return null }
}

export const cookieMaxAge = SESSION_DAYS * 24 * 60 * 60

// ── Magic-link tokens ──────────────────────────────────────────
function randomToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(32))
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

/** Create a one-time login token for an email; returns the RAW token for the link. */
export async function createLoginToken(email: string): Promise<string> {
  const token = randomToken()
  const token_hash = await sha256Hex(token)
  const expires_at = new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000).toISOString()
  await supabaseAdmin.from('customer_login_tokens').insert({ email: email.trim().toLowerCase(), token_hash, expires_at })
  return token
}

/** Verify + consume a token. Returns the email it was issued to, or null. */
export async function consumeLoginToken(token: string): Promise<string | null> {
  const token_hash = await sha256Hex(token)
  const { data } = await supabaseAdmin
    .from('customer_login_tokens')
    .select('id, email, expires_at, used_at')
    .eq('token_hash', token_hash)
    .maybeSingle()
  if (!data || data.used_at || new Date(data.expires_at).getTime() < Date.now()) return null
  await supabaseAdmin.from('customer_login_tokens').update({ used_at: new Date().toISOString() }).eq('id', data.id)
  return data.email
}

// ── Customer + restaurant linking ──────────────────────────────
/** Find-or-create the customer for an email, stamp last_login, link their restaurants. */
export async function resolveCustomerOnLogin(email: string): Promise<CustomerSession> {
  const lower = email.trim().toLowerCase()
  const { data: existing } = await supabaseAdmin.from('customer_users').select('id').eq('email', lower).maybeSingle()
  let cid = existing?.id as string | undefined
  if (!cid) {
    const { data } = await supabaseAdmin.from('customer_users').insert({ email: lower, last_login_at: new Date().toISOString() }).select('id').single()
    cid = data!.id
  } else {
    await supabaseAdmin.from('customer_users').update({ last_login_at: new Date().toISOString() }).eq('id', cid)
  }
  await linkRestaurantsByEmail(cid!, lower)
  return { cid: cid!, email: lower }
}

/** Link every restaurant whose contact email matches the owner (idempotent). */
async function linkRestaurantsByEmail(cid: string, email: string): Promise<void> {
  const { data: rests } = await supabaseAdmin.from('restaurants').select('id').ilike('email', email)
  for (const r of rests ?? []) {
    await supabaseAdmin.from('customer_restaurants').upsert(
      { customer_user_id: cid, restaurant_id: r.id }, { onConflict: 'customer_user_id,restaurant_id' },
    )
  }
}

export interface CustomerRestaurant {
  id: string
  name: string
  city: string | null
  cuisine: string | null
  preview_slug: string | null
  plan: string | null
  visibility_score: number | null
  last_audit_at: string | null
}

/** The restaurants an owner can see, with their latest score (via restaurant_overview). */
export async function listCustomerRestaurants(cid: string): Promise<CustomerRestaurant[]> {
  const { data: links } = await supabaseAdmin.from('customer_restaurants').select('restaurant_id').eq('customer_user_id', cid)
  const ids = (links ?? []).map((l) => l.restaurant_id)
  if (ids.length === 0) return []
  const { data } = await supabaseAdmin
    .from('restaurant_overview')
    .select('id, name, city, cuisine, preview_slug, plan, visibility_score, last_audit_at')
    .in('id', ids)
    .order('last_audit_at', { ascending: false, nullsFirst: false })
  return (data ?? []) as CustomerRestaurant[]
}

/** Whether a customer is allowed to view a given dashboard slug. */
export async function customerOwnsSlug(cid: string, slug: string): Promise<boolean> {
  const { data: r } = await supabaseAdmin.from('restaurants').select('id').eq('preview_slug', slug).maybeSingle()
  if (!r) return false
  const { data: link } = await supabaseAdmin
    .from('customer_restaurants').select('id').eq('customer_user_id', cid).eq('restaurant_id', r.id).maybeSingle()
  return !!link
}
