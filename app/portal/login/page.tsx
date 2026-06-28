'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

const GRAD = 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)'

function LoginForm() {
  const params = useSearchParams()
  const initialError = params.get('error') === 'expired'
    ? 'That link has expired or was already used. Enter your email for a fresh one.'
    : params.get('error') === 'config' ? 'Login is temporarily unavailable. Please try again later.' : ''

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(initialError)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/portal/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Could not send the link')
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#070711', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-inter), sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, padding: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: GRAD, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff' }}>F</span>
          <span style={{ fontSize: 19, fontWeight: 700, color: '#f4f5fa', letterSpacing: -0.5 }}>finded</span>
        </div>

        {sent ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#34d399', marginBottom: 10 }}>
              <CheckCircle2 style={{ width: 20, height: 20 }} /> <span style={{ fontWeight: 700, fontSize: 16 }}>Check your email</span>
            </div>
            <p style={{ fontSize: 14, color: '#9a9fb6', lineHeight: 1.6 }}>
              We sent a sign-in link to <strong style={{ color: '#cfd2e0' }}>{email}</strong>. It works once and expires in 30 minutes.
            </p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f4f5fa', marginBottom: 6, letterSpacing: -0.4 }}>Sign in to your dashboard</h1>
            <p style={{ fontSize: 13.5, color: '#9a9fb6', marginBottom: 20, lineHeight: 1.5 }}>Enter your email and we&rsquo;ll send you a secure sign-in link — no password needed.</p>

            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#646a85', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus placeholder="you@restaurant.com"
              style={{ width: '100%', padding: '11px 13px', fontSize: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', outline: 'none', marginBottom: 14 }} />

            {error && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: '#fca5a5', marginBottom: 14 }}>
                <AlertCircle style={{ width: 15, height: 15, flexShrink: 0, marginTop: 2 }} /> {error}
              </div>
            )}

            <button type="submit" disabled={loading || !email}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '12px', background: GRAD, color: '#fff', fontSize: 14.5, fontWeight: 700, border: 'none', borderRadius: 10, cursor: loading ? 'default' : 'pointer', opacity: loading || !email ? 0.5 : 1, boxShadow: '0 12px 28px -12px rgba(99,102,241,0.7)' }}>
              {loading ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <Mail style={{ width: 16, height: 16 }} />}
              Send me a sign-in link
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function PortalLoginPage() {
  return <Suspense fallback={null}><LoginForm /></Suspense>
}
