'use client'

import { useState, useEffect } from 'react'
import { Spinner } from '@/components/ui'
import { Zap, RefreshCw } from 'lucide-react'

interface Recommendation {
  priority: 'high' | 'medium' | 'low'
  title: string
  what: string
  why: string
  impact: string
}

const PRIORITY_STYLES = {
  high:   { bg: '#fdeaea', color: '#9b2c2c', label: 'HIGH' },
  medium: { bg: '#fef3e2', color: '#7a4f0a', label: 'MED' },
  low:    { bg: '#edf8f3', color: '#0d6b50', label: 'LOW' },
}

export function Recommendations({ auditId }: { auditId: string }) {
  const [recs, setRecs] = useState<Recommendation[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/recommendations?audit_id=${auditId}`)
      .then(r => r.json())
      .then(d => {
        if (d.recommendations) setRecs(d.recommendations)
      })
  }, [auditId])

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audit_id: auditId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRecs(data.recommendations)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-5">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-900">AI-generated recommendations</h3>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 bg-white text-gray-600 hover:border-gray-400 disabled:opacity-50 transition-colors"
        >
          {loading ? <Spinner className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
          {recs ? 'Regenerate' : 'Generate recommendations'}
        </button>
      </div>

      <div className="px-5 py-4">
        {!recs && !loading && !error && (
          <div className="text-center py-8">
            <div className="text-3xl mb-3">✨</div>
            <p className="text-sm font-medium text-gray-900 mb-1">No recommendations yet</p>
            <p className="text-xs text-gray-400 mb-4">
              Click "Generate recommendations" to get personalised AI visibility advice for this restaurant.
            </p>
            <button
              onClick={generate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-gray-900 text-white hover:bg-gray-700 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Generate now
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Spinner className="w-6 h-6 text-gray-400" />
            <p className="text-sm text-gray-400">Analysing audit data and generating recommendations…</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {recs && !loading && (
          <div className="space-y-3">
            {recs.map((rec, i) => {
              const style = PRIORITY_STYLES[rec.priority] ?? PRIORITY_STYLES.medium
              return (
                <div key={i} className="border border-gray-100 rounded-lg p-4 bg-gray-50 hover:border-gray-200 transition-colors">
                  <div className="flex items-start gap-3">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                      style={{ background: style.bg, color: style.color }}
                    >
                      {style.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 mb-2">{rec.title}</div>
                      <div className="text-sm text-gray-700 mb-2 leading-relaxed">
                        <span className="font-semibold text-gray-500 text-xs uppercase tracking-wide">What: </span>
                        {rec.what}
                      </div>
                      <div className="text-sm text-gray-600 mb-2 leading-relaxed">
                        <span className="font-semibold text-gray-500 text-xs uppercase tracking-wide">Why: </span>
                        {rec.why}
                      </div>
                      <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-1 rounded-md">
                        <span>📈</span>
                        {rec.impact}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
