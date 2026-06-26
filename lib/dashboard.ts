/**
 * Dashboard identity. Every audited restaurant gets a permanent, hard-to-guess
 * dashboard slug — the canonical place the customer returns to (the magic link
 * in their email points here). The PDF is just an export of this dashboard.
 */

import { randomBytes } from 'node:crypto'

/** Secure-ish, readable slug: "restaurant-name-<random token>". */
export function secureDashboardSlug(name: string | null | undefined): string {
  const base = (name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  // 80 bits of entropy → unguessable magic link.
  const token = randomBytes(10).toString('hex')
  return `${base || 'restaurant'}-${token}`
}

/**
 * Ensure a restaurant has a dashboard slug; create one if missing. Idempotent —
 * returns the existing slug or the newly created one. Server-only.
 */
export async function ensureDashboardSlug(restaurantId: string, name?: string | null): Promise<string | null> {
  const { supabaseAdmin } = await import('@/lib/supabase/client')
  const { data } = await supabaseAdmin
    .from('restaurants')
    .select('preview_slug, name')
    .eq('id', restaurantId)
    .single()
  if (data?.preview_slug) return data.preview_slug
  const slug = secureDashboardSlug(name ?? data?.name)
  const { error } = await supabaseAdmin
    .from('restaurants')
    .update({ preview_slug: slug })
    .eq('id', restaurantId)
  return error ? null : slug
}

/** Absolute URL for a restaurant's dashboard (the magic link). */
export function dashboardUrl(slug: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://finded.vercel.app').replace(/\/$/, '')
  return `${base}/report/${slug}`
}
