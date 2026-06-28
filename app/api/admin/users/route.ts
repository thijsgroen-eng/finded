import { NextRequest, NextResponse } from 'next/server'
import { normRole } from '@/lib/auth/admin'
import { requireRole, listUsers, createUser, updateUser, deleteUser, logAdminAction } from '@/lib/auth/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/admin/users — list accounts (admin only). */
export async function GET(request: NextRequest) {
  const guard = await requireRole(request, 'admin')
  if (guard instanceof NextResponse) return guard
  return NextResponse.json({ users: await listUsers() })
}

/** POST /api/admin/users { email, password, role } — create an account (admin only). */
export async function POST(request: NextRequest) {
  const guard = await requireRole(request, 'admin')
  if (guard instanceof NextResponse) return guard
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!email || password.length < 8) {
    return NextResponse.json({ error: 'Email and a password of at least 8 characters are required' }, { status: 400 })
  }
  try {
    const user = await createUser(email, password, normRole(body.role))
    await logAdminAction(guard, 'user.create', user.email, { role: user.role })
    return NextResponse.json({ user }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to create user'
    return NextResponse.json({ error: /duplicate|unique/i.test(msg) ? 'That email already exists' : msg }, { status: 400 })
  }
}

/** PATCH /api/admin/users { id, role?, active?, password? } — update (admin only). */
export async function PATCH(request: NextRequest) {
  const guard = await requireRole(request, 'admin')
  if (guard instanceof NextResponse) return guard
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (body.active === false && guard.uid === id) {
    return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 400 })
  }
  const patch: { role?: ReturnType<typeof normRole>; active?: boolean; password?: string } = {}
  if (body.role != null) patch.role = normRole(body.role)
  if (typeof body.active === 'boolean') patch.active = body.active
  if (typeof body.password === 'string' && body.password.length >= 8) patch.password = body.password
  await updateUser(id, patch)
  await logAdminAction(guard, 'user.update', id, { role: patch.role, active: patch.active, password_changed: !!patch.password })
  return NextResponse.json({ ok: true })
}

/** DELETE /api/admin/users?id= — remove an account (admin only). */
export async function DELETE(request: NextRequest) {
  const guard = await requireRole(request, 'admin')
  if (guard instanceof NextResponse) return guard
  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (guard.uid === id) return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
  await deleteUser(id)
  await logAdminAction(guard, 'user.delete', id)
  return NextResponse.json({ ok: true })
}
