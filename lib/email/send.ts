/**
 * Minimal transactional email via Resend's REST API (no SDK dependency).
 *
 * Fails SAFE: if RESEND_API_KEY is unset, sendEmail is a no-op that returns
 * { skipped: true } — nothing throws, so the audit pipeline keeps working before
 * email is configured. Set RESEND_API_KEY and EMAIL_FROM (a verified sender,
 * e.g. "Finded <hello@finded.com>") to start sending.
 */

const RESEND_URL = 'https://api.resend.com/emails'

export interface SendResult {
  sent: boolean
  skipped?: boolean
  error?: string
}

export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
  text?: string
  /** Optional file attachments (content is base64). */
  attachments?: { filename: string; content: string }[]
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { sent: false, skipped: true }
  const from = process.env.EMAIL_FROM || 'Finded <onboarding@resend.dev>'
  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: [opts.to], subject: opts.subject, html: opts.html, text: opts.text,
        ...(opts.attachments?.length ? { attachments: opts.attachments } : {}),
      }),
    })
    if (!res.ok) return { sent: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 200)}` }
    return { sent: true }
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : 'email send failed' }
  }
}

const wrap = (body: string) =>
  `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#111110;line-height:1.6">${body}
   <p style="font-size:12px;color:#b0aea8;margin-top:24px">Finded · AI visibility for restaurants · Netherlands</p></div>`

/** Sent as soon as a public request comes in. */
export function requestReceivedEmail(): { subject: string; html: string; text: string } {
  const text =
    'Thanks — we received your request. We\'re checking how AI tools talk about your restaurant and will email you the results, usually within a few days. AI answers vary over time, so we measure across several prompts and models.'
  return {
    subject: 'We\'re checking your restaurant\'s AI visibility',
    html: wrap(
      `<h2 style="font-size:20px;margin:0 0 12px">Thanks — we\'re on it</h2>
       <p>We received your request and we\'re checking how ChatGPT, Claude, Gemini and Perplexity talk about your restaurant.</p>
       <p>You\'ll get the results by email, usually within a few days. AI answers vary over time, so we measure across several prompts and models rather than claiming a single fixed ranking.</p>`,
    ),
    text,
  }
}

/** Sent when the audit completes, linking to the public report when available. */
export function reportReadyEmail(opts: { restaurantName?: string | null; reportUrl?: string | null }): { subject: string; html: string; text: string } {
  const name = opts.restaurantName?.trim() || 'your restaurant'
  const cta = opts.reportUrl
    ? `<p style="margin:20px 0"><a href="${opts.reportUrl}" style="background:#111110;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;display:inline-block">View your report</a></p>
       <p style="font-size:13px;color:#7a7874">Or paste this link into your browser:<br>${opts.reportUrl}</p>`
    : `<p>Reply to this email and we\'ll send your report over.</p>`
  return {
    subject: `Your AI visibility report for ${name} is ready`,
    html: wrap(
      `<h2 style="font-size:20px;margin:0 0 12px">Your report is ready</h2>
       <p>We finished checking how AI tools recommend restaurants like ${name}, which competitors appear instead, and what to fix.</p>${cta}`,
    ),
    text: opts.reportUrl
      ? `Your AI visibility report for ${name} is ready: ${opts.reportUrl}`
      : `Your AI visibility report for ${name} is ready — reply and we'll send it over.`,
  }
}
