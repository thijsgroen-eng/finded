import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: entity, error } = await supabaseAdmin
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !entity) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: audits } = await supabaseAdmin
    .from('audits')
    .select('*')
    .eq('restaurant_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  const auditIds = (audits ?? [])
    .filter(a => a.status === 'completed')
    .map(a => a.id)

  let mentionSummary: Record<string, number> = {}
  if (auditIds.length > 0) {
    const { data: mentions } = await supabaseAdmin
      .from('mentions')
      .select('audit_id')
      .in('audit_id', auditIds)
      .eq('mentioned', true)

    for (const m of mentions ?? []) {
      mentionSummary[m.audit_id] = (mentionSummary[m.audit_id] ?? 0) + 1
    }
  }

  return NextResponse.json({ data: entity, audits, mentionSummary })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const allowed = ['name', 'website', 'city', 'country', 'cuisine', 'email', 'phone', 'business_type', 'subtypes']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabaseAdmin
    .from('restaurants')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error } = await supabaseAdmin.from('restaurants').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
