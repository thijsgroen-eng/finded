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
    ? `<p style="margin:22px 0"><a href="${opts.reportUrl}" style="background:#0f766e;color:#fff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:700;display:inline-block">Open your dashboard</a></p>
       <p style="font-size:13px;color:#7a7874">This is your private link — keep it to return any time:<br><a href="${opts.reportUrl}" style="color:#0f766e">${opts.reportUrl}</a></p>
       <p style="font-size:13px;color:#7a7874;margin-top:14px">You can download a PDF export from the dashboard whenever you need one.</p>`
    : `<p>Reply to this email and we\'ll send your dashboard link over.</p>`
  return {
    subject: `Your AI Visibility Dashboard for ${name} is ready`,
    html: wrap(
      `<h2 style="font-size:20px;margin:0 0 12px">Your dashboard is ready</h2>
       <p>We measured how ChatGPT, Claude, Gemini and Perplexity recommend restaurants like ${name}, which competitors appear instead, and what to improve. It&rsquo;s all in your dashboard — your permanent home for these results.</p>${cta}`,
    ),
    text: opts.reportUrl
      ? `Your AI Visibility Dashboard for ${name} is ready. Open it here (your private link): ${opts.reportUrl}`
      : `Your AI Visibility Dashboard for ${name} is ready — reply and we'll send your link over.`,
  }
}

/** Passwordless customer login link. */
export function customerMagicLinkEmail(opts: { url: string }): { subject: string; html: string; text: string } {
  return {
    subject: 'Your Finded login link',
    html: wrap(
      `<h2 style="font-size:20px;margin:0 0 12px">Sign in to your dashboard</h2>
       <p>Click below to open your Finded AI Visibility dashboard. This link works once and expires in 30 minutes.</p>
       <p style="margin:22px 0"><a href="${opts.url}" style="background:#7c5cff;color:#fff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:700;display:inline-block">Open my dashboard</a></p>
       <p style="font-size:13px;color:#7a7874">If you didn&rsquo;t request this, you can ignore this email.</p>`,
    ),
    text: `Sign in to your Finded dashboard (link works once, expires in 30 min): ${opts.url}`,
  }
}

export interface MonitoringSummaryInput {
  restaurantName?: string | null
  visibilityScore: number | null
  visibilityDelta: number | null
  factsChanged?: Record<string, { from: boolean; to: boolean }>
  providersChanged?: Record<string, { from: boolean; to: boolean }>
  reportUrl?: string | null
  lang?: 'nl' | 'en'
}

const PROVIDER_LABEL: Record<string, string> = { openai: 'ChatGPT', anthropic: 'Claude', gemini: 'Gemini', perplexity: 'Perplexity' }

/**
 * Monthly monitoring digest (#12) — a deterministic summary of what changed since
 * the last audit. Pure string builder; numbers come from the Observation Engine's
 * change log, never from an LLM.
 */
export function monitoringSummaryEmail(i: MonitoringSummaryInput): { subject: string; html: string; text: string } {
  const nl = i.lang === 'nl'
  const name = i.restaurantName?.trim() || (nl ? 'je restaurant' : 'your restaurant')
  const d = i.visibilityDelta
  const dir = d == null || d === 0
    ? (nl ? 'ongewijzigd' : 'unchanged')
    : d > 0 ? (nl ? `+${Math.round(d)} gestegen` : `up +${Math.round(d)}`)
            : (nl ? `${Math.round(d)} gedaald` : `down ${Math.round(d)}`)
  const score = i.visibilityScore != null ? Math.round(i.visibilityScore) : '—'

  const providerLines = Object.entries(i.providersChanged ?? {}).map(([p, c]) =>
    nl ? `${PROVIDER_LABEL[p] ?? p} ${c.to ? 'noemt je nu wél' : 'noemt je niet meer'}`
       : `${PROVIDER_LABEL[p] ?? p} ${c.to ? 'now mentions you' : 'no longer mentions you'}`)
  const factCount = Object.keys(i.factsChanged ?? {}).length

  const changeBits: string[] = []
  if (providerLines.length) changeBits.push(...providerLines)
  if (factCount) changeBits.push(nl ? `${factCount} websitesignaal(en) gewijzigd` : `${factCount} website signal(s) changed`)
  const changeList = changeBits.length
    ? `<ul style="margin:8px 0 0;padding-left:18px">${changeBits.map((b) => `<li>${b}</li>`).join('')}</ul>`
    : `<p style="color:#7a7874">${nl ? 'Geen noemenswaardige veranderingen deze periode.' : 'No notable changes this period.'}</p>`

  const cta = i.reportUrl
    ? `<p style="margin:22px 0"><a href="${i.reportUrl}" style="background:#0f766e;color:#fff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:700;display:inline-block">${nl ? 'Bekijk je dashboard' : 'View your dashboard'}</a></p>`
    : ''

  return {
    subject: nl
      ? `AI-zichtbaarheid van ${name}: ${score}/100 (${dir})`
      : `${name}'s AI visibility: ${score}/100 (${dir})`,
    html: wrap(
      `<h2 style="font-size:20px;margin:0 0 12px">${nl ? 'Je maandelijkse AI-zichtbaarheidsupdate' : 'Your monthly AI visibility update'}</h2>
       <p>${nl ? 'We hebben opnieuw gemeten hoe AI-assistenten' : 'We re-measured how AI assistants recommend'} ${name} ${nl ? 'aanbevelen.' : '.'}</p>
       <p style="font-size:15px"><strong>${nl ? 'Zichtbaarheidsscore' : 'Visibility score'}: ${score}/100</strong> · ${dir}</p>
       <p style="margin:14px 0 0;font-weight:600">${nl ? 'Wat is er veranderd' : 'What changed'}</p>${changeList}${cta}`,
    ),
    text: `${name} — ${nl ? 'AI-zichtbaarheid' : 'AI visibility'}: ${score}/100 (${dir}). ${changeBits.join('; ') || (nl ? 'Geen grote veranderingen.' : 'No major changes.')}${i.reportUrl ? ` ${i.reportUrl}` : ''}`,
  }
}
