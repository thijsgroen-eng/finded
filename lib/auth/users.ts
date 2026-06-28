import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import {
  ADMIN_COOKIE, readSession, hashPassword, verifyPassword, roleAtLeast,
  type Role, type Session,
} from '@/lib/auth/admin'

/**
 * Admin user accounts, role guards and the admin audit log (#9). Node-only
 * (service-role DB access). The crypto lives in lib/auth/admin.ts so middleware
 * stays edge-safe.
 */

export interface AdminUser {
  id: string
  email: string
  role: Role
  active: boolean
  last_login_at: string | null
  created_at: string
}

const PUBLIC_COLS = 'id, email, role, active, last_login_at, created_at'

export async function listUsers(): Promise<AdminUser[]> {
  const { data } = await supabaseAdmin.from('admin_users').select(PUBLIC_COLS).order('created_at', { ascending: true })
  return (data ?? []) as AdminUser[]
}

export async function countUsers(): Promise<number> {
  const { count } = await supabaseAdmin.from('admin_users').select('id', { count: 'exact', head: true })
  return count ?? 0
}

export async function createUser(email: string, password: string, role: Role): Promise<AdminUser> {
  const password_hash = await hashPassword(password)
  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .insert({ email: email.trim().toLowerCase(), password_hash, role })
    .select(PUBLIC_COLS)
    .single()
  if (error) throw new Error(error.message)
  return data as AdminUser
}

export async function updateUser(
  id: string,
  patch: { role?: Role; active?: boolean; password?: string },
): Promise<void> {
  const update: Record<string, unknown> = {}
  if (patch.role) update.role = patch.role
  if (typeof patch.active === 'boolean') update.active = patch.active
  if (patch.password) update.password_hash = await hashPassword(patch.password)
  if (Object.keys(update).length === 0) return
  const { error } = await supabaseAdmin.from('admin_users').update(update).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteUser(id: string): Promise<void> {
  await supabaseAdmin.from('admin_users').delete().eq('id', id)
}

/** Verify credentials and return the user's session shape, or null. */
export async function authenticate(email: string, password: string): Promise<Session | null> {
  const { data } = await supabaseAdmin
    .from('admin_users')
    .select('id, email, role, active, password_hash')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()
  if (!data || !data.active) return null
  if (!(await verifyPassword(password, data.password_hash))) return null
  await supabaseAdmin.from('admin_users').update({ last_login_at: new Date().toISOString() }).eq('id', data.id)
  return { uid: data.id, email: data.email, role: data.role as Role }
}

/** The current session for a request (signed user token or legacy shared token). */
export async function sessionFromRequest(request: NextRequest): Promise<Session | null> {
  return readSession(request.cookies.get(ADMIN_COOKIE)?.value)
}

/**
 * Route guard: ensure the caller is authenticated and at least `min` role.
 * Returns the Session on success, or a NextResponse (401/403) to return directly.
 */
export async function requireRole(request: NextRequest, min: Role): Promise<Session | NextResponse> {
  const session = await sessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!roleAtLeast(session.role, min)) {
    return NextResponse.json({ error: `Requires ${min} role` }, { status: 403 })
  }
  return session
}

/** Append an entry to the admin audit log. Best-effort — never throws. */
export async function logAdminAction(
  session: Session | null,
  action: string,
  target?: string | null,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    await supabaseAdmin.from('admin_audit_log').insert({
      user_id: session?.uid ?? null,
      email: session?.email ?? null,
      action,
      target: target ?? null,
      data: data ?? null,
    })
  } catch { /* audit log is best-effort */ }
}

export async function listAuditLog(limit = 200): Promise<Record<string, unknown>[]> {
  const { data } = await supabaseAdmin
    .from('admin_audit_log').select('id, email, action, target, data, at')
    .order('at', { ascending: false }).limit(limit)
  return data ?? []
}
