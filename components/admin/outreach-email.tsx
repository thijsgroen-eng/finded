'use client'

import { useState } from 'react'
import { Mail, RefreshCw, Copy, Check } from 'lucide-react'
import { Spinner } from '@/components/ui'

interface Props {
  auditId: string
  restaurantName: string
}

export function OutreachEmail({ auditId, restaurantName }: Props) {
  const [email, setEmail] = useState<{ subject: string; body: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audit_id: auditId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEmail(data.email)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setLoading(false)
    }
  }

  async function copyEmail() {
    if (!email) return
    await navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-5">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-900">Outreach email</h3>
        </div>
        <div className="flex gap-2">
          {email && (
            <button
              onClick={copyEmail}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 bg-white text-gray-600 hover:border-gray-400 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
          <button
            onClick={generate}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 bg-white text-gray-600 hover:border-gray-400 disabled:opacity-50 transition-colors"
          >
            {loading ? <Spinner className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
            {email ? 'Regenerate' : 'Generate email'}
          </button>
        </div>
      </div>

      <div className="px-5 py-4">
        {!email && !loading && !error && (
          <div className="text-center py-8">
            <div className="text-3xl mb-3">✉️</div>
            <p className="text-sm font-medium text-gray-900 mb-1">No outreach email yet</p>
            <p className="text-xs text-gray-400 mb-4">
              Generate a personalised cold email based on this restaurant's audit findings.
            </p>
            <button
              onClick={generate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-gray-900 text-white hover:bg-gray-700 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              Generate email
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Spinner className="w-6 h-6 text-gray-400" />
            <p className="text-sm text-gray-400">Writing personalised outreach email…</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {email && !loading && (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-md px-4 py-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Subject</p>
              <p className="text-sm font-medium text-gray-900">{email.subject}</p>
            </div>
            <div className="bg-gray-50 rounded-md px-4 py-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Body</p>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {email.body}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
