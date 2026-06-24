import { inngest } from '@/lib/inngest/client'
import { supabaseAdmin } from '@/lib/supabase/client'
import { createAuditFromRequest } from '@/lib/leads/process-request'
import { sendEmail, requestReceivedEmail } from '@/lib/email/send'

/**
 * Auto-runs a public audit request: emails the requester a confirmation, then
 * detects the business, creates the restaurant, and queues the audit — no manual
 * approval needed. Runs asynchronously so the public POST returns instantly, and
 * is retried by Inngest. If it ultimately fails, the request is left as
 * 'new_request' so an operator can run it by hand from /admin/requests.
 */
export const auditRequestFunction = inngest.createFunction(
  {
    id: 'process-audit-request',
    name: 'Process public audit request',
    retries: 2,
    triggers: [{ event: 'audit-request/created' }],
    onFailure: async ({ event }: { event: any }) => {
      const requestId = event?.data?.event?.data?.request_id
      if (!requestId) return
      await supabaseAdmin
        .from('audit_requests')
        .update({ status: 'new_request', updated_at: new Date().toISOString() })
        .eq('id', requestId)
    },
  },
  async ({ event, step }: { event: { data: { request_id: string } }; step: any }) => {
    const { request_id } = event.data

    const { data: req } = await supabaseAdmin
      .from('audit_requests').select('*').eq('id', request_id).single()
    if (!req) return { skipped: true, reason: 'request not found' }

    // Confirmation email (no-op if email isn't configured).
    await step.run(`confirm-${request_id}`, async () => {
      if (!req.email) return { skipped: true }
      const mail = requestReceivedEmail()
      return sendEmail({ to: req.email, subject: mail.subject, html: mail.html, text: mail.text })
    })

    // Detect → create restaurant → queue audit (links back onto the request).
    const result = await step.run(`create-audit-${request_id}`, async () => createAuditFromRequest(req))

    return { ok: true, ...result }
  },
)
