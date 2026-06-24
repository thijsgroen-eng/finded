'use client'

import { useState } from 'react'
import { validateAuditRequest } from '@/lib/leads/audit-request'

const GREEN = '#16a37a'
const INK = '#111110'
const MUTED = '#7a7874'
const BORDER = '#e2e1dc'

/**
 * Inline lead-capture form for the public landing page. Posts to the public
 * /api/audit-request endpoint (validated + rate-limited server-side). Mirrors the
 * /audit funnel but trimmed to website/city/email for low friction. Honeypot +
 * shared validator for spam/abuse protection.
 */
export function LeadForm() {
  const [form, setForm] = useState({ website: '', city: '', email: '', company: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setServerError('')
    const result = validateAuditRequest(form)
    if (!result.ok && !result.spam) { setErrors(result.errors); return }
    setErrors({})
    setSubmitting(true)
    try {
      const res = await fetch('/api/audit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (json.errors) setErrors(json.errors)
        else setServerError(json.error ?? 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }
      setDone(true)
    } catch {
      setServerError('Could not reach the server. Please try again.')
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 34, marginBottom: 6 }}>✅</div>
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: INK }}>We&rsquo;ve got your request</h3>
        <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>
          We&rsquo;ll prepare your AI visibility report and email the results. Most are handled within
          a few business days. Results are measured across a set of AI models and prompts and can vary.
        </p>
      </div>
    )
  }

  const inputStyle = (err?: string): React.CSSProperties => ({
    width: '100%', padding: '12px 14px', fontSize: 15, borderRadius: 9,
    border: `1px solid ${err ? '#e0a3a3' : BORDER}`, outline: 'none', background: '#fff', color: INK,
  })

  return (
    <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <input style={inputStyle(errors.website)} placeholder="Restaurant website (e.g. restaurant.nl)" value={form.website} onChange={set('website')} />
        {errors.website && <p style={{ color: '#b3261e', fontSize: 12, marginTop: 4 }}>{errors.website}</p>}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 140px' }}>
          <input style={inputStyle(errors.city)} placeholder="City (e.g. Amsterdam)" value={form.city} onChange={set('city')} />
          {errors.city && <p style={{ color: '#b3261e', fontSize: 12, marginTop: 4 }}>{errors.city}</p>}
        </div>
        <div style={{ flex: '1 1 160px' }}>
          <input style={inputStyle(errors.email)} placeholder="Email for the report" value={form.email} onChange={set('email')} />
          {errors.email && <p style={{ color: '#b3261e', fontSize: 12, marginTop: 4 }}>{errors.email}</p>}
        </div>
      </div>

      {/* Honeypot */}
      <div aria-hidden style={{ position: 'absolute', left: -9999, height: 0, overflow: 'hidden' }}>
        <label>Company<input tabIndex={-1} autoComplete="off" value={form.company} onChange={set('company')} /></label>
      </div>

      {serverError && <p style={{ color: '#b3261e', fontSize: 13 }}>{serverError}</p>}

      <button type="submit" disabled={submitting}
        style={{ background: INK, color: '#fff', border: 'none', padding: '14px 20px', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
        {submitting ? 'Sending…' : 'Check my AI visibility'}
      </button>
      <p style={{ fontSize: 12, color: '#b0aea8', textAlign: 'center' }}>
        <span style={{ color: GREEN, fontWeight: 600 }}>Free</span> · no account needed · we only use this to send your report
      </p>
    </form>
  )
}
