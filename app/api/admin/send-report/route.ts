import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { buildReportPdf } from '@/lib/report/build'
import { normalizeVariant, type ReportVariant } from '@/lib/report/report-document'
import { sendEmail } from '@/lib/email/send'
import { isValidEmail } from '@/lib/leads/audit-request'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PLAN_LABEL: Record<string, string> = {
  free: 'AI visibility check',
  audit: 'AI visibility audit',
  implementation: 'AI visibility implementation plan',
}

/**
 * POST /api/admin/send-report  { audit_id, plan, lang?, to? }  (admin-gated)
 * Builds the plan-specific PDF and emails it as an attachment. `to` defaults to
 * the email on the linked public request. Requires email to be configured
 * (RESEND_API_KEY); otherwise returns a clear 'not configured' response.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const auditId = typeof body.audit_id === 'string' ? body.audit_id : null
  const rawPlan = typeof body.plan === 'string' ? body.plan : 'free'
  const lang = typeof body.lang === 'string' ? body.lang : null
  const plan = (['free', 'audit', 'implementation'].includes(rawPlan) ? rawPlan : 'free') as ReportVariant

  if (!auditId) return NextResponse.json({ error: 'audit_id required' }, { status: 400 })
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email is not configured (set RESEND_API_KEY + EMAIL_FROM).' }, { status: 503 })
  }

  // Resolve recipient: explicit `to`, else the linked request's email.
  let to = typeof body.to === 'string' ? body.to.trim() : ''
  if (!to) {
    const { data: req } = await supabaseAdmin
      .from('audit_requests').select('email').eq('audit_id', auditId).maybeSingle()
    to = req?.email ?? ''
  }
  if (!isValidEmail(to)) {
    return NextResponse.json({ error: 'No valid recipient email (none on the request — provide one).' }, { status: 400 })
  }

  const pdf = await buildReportPdf(auditId, plan, lang)
  if (!pdf.ok) return NextResponse.json({ error: pdf.error }, { status: pdf.status })

  const label = PLAN_LABEL[normalizeVariant(plan)]
  const result = await sendEmail({
    to,
    subject: `Your ${label} — ${pdf.restaurantName}`,
    html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#111110;line-height:1.6">
      <h2 style="font-size:20px">Your ${label} is attached</h2>
      <p>Please find your ${label} for <strong>${pdf.restaurantName}</strong> attached as a PDF.</p>
      <p style="font-size:13px;color:#7a7874">AI answers vary over time, so this reflects a snapshot across the prompts and models we tested.</p>
      <p style="font-size:12px;color:#b0aea8;margin-top:24px">Finded · AI visibility for restaurants · Netherlands</p>
    </div>`,
    text: `Your ${label} for ${pdf.restaurantName} is attached.`,
    attachments: [{ filename: pdf.filename, content: pdf.buffer.toString('base64') }],
  })

  if (!result.sent) {
    return NextResponse.json({ error: result.error ?? 'Email could not be sent' }, { status: 502 })
  }
  return NextResponse.json({ ok: true, to })
}
