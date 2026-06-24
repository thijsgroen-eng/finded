'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Globe, Mail, MapPin, Phone, ArrowRight, Loader2,
  CheckCircle2, AlertCircle, Search, BarChart3, Users, FileCheck, Wrench,
} from 'lucide-react'
import { validateAuditRequest, type AuditRequestInput } from '@/lib/leads/audit-request'

const WHAT_YOU_GET = [
  { icon: Search,    title: 'AI visibility check', desc: 'Whether ChatGPT, Claude, Gemini & Perplexity name your restaurant.' },
  { icon: BarChart3, title: 'Model & prompt coverage', desc: 'Which AI models and which diner questions you show up for.' },
  { icon: Users,     title: 'Competitor signals', desc: 'Which restaurants get recommended instead of you, and how often.' },
  { icon: FileCheck, title: 'Website signal review', desc: 'The structured-data and content signals AI models read.' },
  { icon: Wrench,    title: 'Recommended fixes', desc: 'Concrete, prioritised steps to get found more often.' },
]

type Field = keyof AuditRequestInput

export default function AuditRequestPage() {
  const [form, setForm] = useState<Record<Field, string>>({
    website: '', restaurant_name: '', city: '', email: '', phone: '', note: '', company: '',
  })
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState('')

  const set = (k: Field) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setServerError('')
    const result = validateAuditRequest(form)
    if (!result.ok && !result.spam) {
      setErrors(result.errors)
      return
    }
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

  return (
    <div className="min-h-screen bg-[#fafaf8] text-[#111110]" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Minimal nav */}
      <nav className="border-b border-[#e2e1dc] px-6 h-14 flex items-center">
        <Link href="/" className="font-extrabold text-lg tracking-tight">Finded</Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10 grid lg:grid-cols-[1.1fr_0.9fr] gap-10">
        {/* Left: the action */}
        <div>
          <span className="inline-block bg-[#edf8f3] text-[#0d6b50] text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-4">
            Restaurants · Netherlands
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight leading-tight mb-2">
            Request your AI visibility audit
          </h1>
          <p className="text-[#7a7874] mb-6 leading-relaxed">
            See whether AI assistants recommend your restaurant when diners ask
            <em> &ldquo;beste restaurants in …&rdquo;</em> — in Dutch, the way people actually search.
            Enter your website and we&rsquo;ll prepare your report.
          </p>

          {done ? (
            <div className="bg-white border border-[#e2e1dc] rounded-2xl p-7">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-3" />
              <h2 className="text-xl font-bold mb-2">We received your request</h2>
              <p className="text-[#7a7874] leading-relaxed mb-4">
                Thanks — we&rsquo;ll review your restaurant and prepare your AI visibility report,
                then send the results to your email. Most requests are handled within a few business days.
              </p>
              <p className="text-xs text-[#b0aea8] leading-relaxed">
                Results are measured across a selected set of AI models and diner prompts and can vary
                between runs — your report explains exactly how it was measured.
              </p>
              <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#16a37a] mt-5 hover:underline">
                Back to home
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="bg-white border border-[#e2e1dc] rounded-2xl p-6 space-y-4" noValidate>
              <Input id="website" label="Restaurant website" required placeholder="restaurant.nl"
                icon={Globe} value={form.website} onChange={set('website')} error={errors.website} type="text" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input id="restaurant_name" label="Restaurant name" placeholder="optional"
                  value={form.restaurant_name} onChange={set('restaurant_name')} error={errors.restaurant_name} />
                <Input id="city" label="City" placeholder="Amsterdam" icon={MapPin}
                  value={form.city} onChange={set('city')} error={errors.city} />
              </div>
              <Input id="email" label="Contact email" required placeholder="you@restaurant.nl"
                icon={Mail} value={form.email} onChange={set('email')} error={errors.email} type="email" />
              <Input id="phone" label="Phone" placeholder="optional" icon={Phone}
                value={form.phone} onChange={set('phone')} error={errors.phone} />
              <Textarea id="note" label="Anything we should know?" placeholder="optional"
                value={form.note} onChange={set('note')} error={errors.note} />

              {/* Honeypot — visually hidden, ignored by humans */}
              <div aria-hidden className="hidden">
                <label>Company
                  <input tabIndex={-1} autoComplete="off" value={form.company} onChange={set('company')} />
                </label>
              </div>

              {serverError && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {serverError}
                </div>
              )}

              <button type="submit" disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#111110] text-white text-sm font-bold rounded-xl hover:bg-[#2a2a28] disabled:opacity-50 transition-colors">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Request my audit
              </button>
              <p className="text-xs text-[#b0aea8] text-center">No account needed · we only use this to send your report.</p>
            </form>
          )}
        </div>

        {/* Right: what you get */}
        <aside className="lg:pt-12">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#b0aea8] mb-4">What you get</h2>
          <div className="space-y-4">
            {WHAT_YOU_GET.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-[#e2e1dc] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[#16a37a]" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-sm text-[#7a7874] leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

function Input({ id, label, icon: Icon, error, required, type = 'text', ...rest }: {
  id: string; label: string; icon?: React.ElementType; error?: string; required?: boolean
  type?: string; value: string; placeholder?: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-[#3a3935] mb-1.5">
        {label}{required && <span className="text-[#16a37a]"> *</span>}
      </label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b0aea8]" />}
        <input id={id} type={type}
          className={`w-full ${Icon ? 'pl-9' : 'pl-3'} pr-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#111110]/10 ${error ? 'border-red-300' : 'border-[#e2e1dc]'}`}
          {...rest} />
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

function Textarea({ id, label, error, ...rest }: {
  id: string; label: string; error?: string
  value: string; placeholder?: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-[#3a3935] mb-1.5">{label}</label>
      <textarea id={id} rows={3}
        className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#111110]/10 ${error ? 'border-red-300' : 'border-[#e2e1dc]'}`}
        {...rest} />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
