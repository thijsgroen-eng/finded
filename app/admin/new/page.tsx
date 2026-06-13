'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, Loader2, CheckCircle2, ArrowRight, AlertCircle, Sparkles } from 'lucide-react'

type Step = 'input' | 'detecting' | 'detected' | 'creating' | 'done' | 'error'

interface DetectedBusiness {
  name: string
  business_type: string
  subtypes: string[]
  city: string
  country: string
  description: string
  confidence: number
  wordpress_detected: boolean
  cms: string | null
}

const TYPE_EMOJI: Record<string, string> = {
  restaurant: '🍽️', hotel: '🏨', dentist: '🦷', lawyer: '⚖️',
  clinic: '🏥', agency: '📣', saas: '💻', ecommerce: '🛒',
  gym: '💪', salon: '✂️', other: '🏢',
}

export default function NewAuditPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [step, setStep] = useState<Step>('input')
  const [business, setBusiness] = useState<DetectedBusiness | null>(null)
  const [error, setError] = useState('')
  const [editName, setEditName] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editType, setEditType] = useState('')

  async function handleDetect() {
    if (!url.trim()) return
    setStep('detecting')
    setError('')

    try {
      const res = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setBusiness(json.business)
      setEditName(json.business.name)
      setEditCity(json.business.city)
      setEditType(json.business.business_type)
      setStep('detected')
    } catch (err: any) {
      setError(err.message ?? 'Failed to analyze website')
      setStep('error')
    }
  }

  async function handleStartAudit() {
    setStep('creating')
    try {
      const res = await fetch('/api/detect', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      // Update name/city/type if user edited them
      if (editName !== json.entity.name || editCity !== json.entity.city || editType !== json.entity.business_type) {
        await fetch(`/api/restaurants/${json.entity.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editName, city: editCity, business_type: editType }),
        })
      }

      setStep('done')
      setTimeout(() => {
        router.push(`/admin/audits/${json.audit_id}`)
      }, 1200)
    } catch (err: any) {
      setError(err.message ?? 'Failed to start audit')
      setStep('error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 text-xs font-medium text-gray-500 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            AI Visibility Audit
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Analyze any business</h1>
          <p className="text-sm text-gray-500 mt-2">Enter a website URL — we detect the business type and run the audit automatically</p>
        </div>

        {/* URL input */}
        {(step === 'input' || step === 'error') && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Website URL
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleDetect()}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  autoFocus
                />
              </div>
              <button
                onClick={handleDetect}
                disabled={!url.trim()}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                Analyze
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {error && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            <p className="mt-3 text-xs text-gray-400">
              Works for any business — restaurant, dentist, lawyer, hotel, agency, SaaS, ecommerce
            </p>
          </div>
        )}

        {/* Detecting */}
        {step === 'detecting' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-700">Analyzing website…</p>
            <p className="text-xs text-gray-400 mt-1">Detecting business type, location, and specialties</p>
          </div>
        )}

        {/* Detected — confirm */}
        {step === 'detected' && business && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center text-2xl shrink-0">
                  {TYPE_EMOJI[business.business_type] ?? '🏢'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide capitalize">
                      {business.business_type}
                    </span>
                    {business.wordpress_detected && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                        WordPress
                      </span>
                    )}
                    {business.cms && !business.wordpress_detected && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full capitalize">
                        {business.cms}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{business.description}</p>
                  {business.subtypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {business.subtypes.map(s => (
                        <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full capitalize">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Editable fields */}
            <div className="p-6 space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Confirm details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Business name</label>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">City</label>
                  <input
                    value={editCity}
                    onChange={e => setEditCity(e.target.value)}
                    placeholder="Amsterdam"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Business type</label>
                <select
                  value={editType}
                  onChange={e => setEditType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  {Object.keys(TYPE_EMOJI).map(t => (
                    <option key={t} value={t} className="capitalize">
                      {TYPE_EMOJI[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={handleStartAudit}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Run AI visibility audit
              </button>
              <button
                onClick={() => { setStep('input'); setBusiness(null) }}
                className="px-4 py-3 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Creating */}
        {step === 'creating' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-700">Starting audit…</p>
            <p className="text-xs text-gray-400 mt-1">Running prompts across ChatGPT, Claude, Gemini, and Perplexity</p>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-700">Audit running!</p>
            <p className="text-xs text-gray-400 mt-1">Redirecting to results…</p>
          </div>
        )}

      </div>
    </div>
  )
}
