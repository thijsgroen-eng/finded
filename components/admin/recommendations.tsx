'use client'

import { useState, useEffect } from 'react'
import { Spinner } from '@/components/ui'
import { Zap, RefreshCw, Wrench, Download, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { PRIORITY_RANK_LABEL, priorityRankOrder, type PriorityRank } from '@/lib/audit/recommendation-priority'

interface Recommendation {
  id?: string
  priority: 'high' | 'medium' | 'low'
  title: string
  what: string
  why: string
  impact: string
  type?: string
  status?: string
  evidence?: string | null
  impact_level?: 'high' | 'medium' | 'low'
  effort?: 'high' | 'medium' | 'low'
  priority_rank?: PriorityRank
}

const RANK_STYLE: Record<PriorityRank, { bg: string; color: string }> = {
  do_first: { bg: '#fdeaea', color: '#9b2c2c' },
  do_next:  { bg: '#fef3e2', color: '#7a4f0a' },
  optional: { bg: '#eef0f2', color: '#5b6168' },
}

interface GeneratedAsset {
  id: string
  type: string
  title: string
  content: string
  format: string
  status: string
  version: number
  created_at: string
}

function AssetPreview({ asset, onRegenerate, loading }: {
  asset: GeneratedAsset
  onRegenerate: () => void
  loading: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(true)

  async function copy() {
    await navigator.clipboard.writeText(asset.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function download() {
    const ext = asset.format === 'json-ld' ? 'html' : asset.format === 'html' ? 'html' : 'txt'
    const blob = new Blob([asset.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${asset.type}-${asset.version}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700">{asset.title}</span>
          <span className="text-xs text-gray-400">v{asset.version}</span>
          <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">Ready</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={copy}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded border border-gray-200 bg-white hover:border-gray-300 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={download}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded border border-gray-200 bg-white hover:border-gray-300 transition-colors"
          >
            <Download className="w-3 h-3" />
            Download
          </button>
          <button
            onClick={onRegenerate}
            disabled={loading}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded border border-gray-200 bg-white hover:border-gray-300 disabled:opacity-50 transition-colors"
          >
            {loading ? <Spinner className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
            Regenerate
          </button>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      {expanded && (
        <pre className="px-4 py-3 text-xs text-gray-700 font-mono bg-white overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
          {asset.content}
        </pre>
      )}
    </div>
  )
}

export function Recommendations({ auditId }: { auditId: string }) {
  const [recs, setRecs] = useState<Recommendation[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fixLoading, setFixLoading] = useState<Record<string, boolean>>({})
  const [assets, setAssets] = useState<Record<string, GeneratedAsset>>({})
  const [restaurantId, setRestaurantId] = useState<string | null>(null)

  useEffect(() => {
    // Load existing recommendations
    fetch(`/api/recommendations?audit_id=${auditId}`)
      .then(r => r.json())
      .then(d => {
        if (d.recommendations) setRecs(d.recommendations)
        if (d.restaurant_id) setRestaurantId(d.restaurant_id)
      })
  }, [auditId])

  // Load existing assets for recommendations that have IDs
  useEffect(() => {
    if (!recs) return
    const recsWithIds = recs.filter(r => r.id && r.status === 'generated')
    recsWithIds.forEach(async (rec) => {
      if (!rec.id) return
      const res = await fetch(`/api/fix?recommendation_id=${rec.id}`)
      const data = await res.json()
      if (data.asset) {
        setAssets(prev => ({ ...prev, [rec.id!]: data.asset }))
      }
    })
  }, [recs])

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
      if (data.restaurant_id) setRestaurantId(data.restaurant_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setLoading(false)
    }
  }

  async function generateFix(rec: Recommendation) {
    if (!rec.id) return
    const fixType = rec.type // backend-authoritative; no client-side text inference
    if (!fixType) return

    setFixLoading(prev => ({ ...prev, [rec.id!]: true }))

    try {
      const res = await fetch('/api/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendation_id: rec.id }),
      })
      if (!res.ok) throw new Error('Failed to trigger fix')

      // Poll for completion
      const poll = setInterval(async () => {
        const assetRes = await fetch(`/api/fix?recommendation_id=${rec.id}`)
        const assetData = await assetRes.json()
        if (assetData.asset) {
          setAssets(prev => ({ ...prev, [rec.id!]: assetData.asset }))
          setFixLoading(prev => ({ ...prev, [rec.id!]: false }))
          clearInterval(poll)
        }
      }, 3000)

      // Stop polling after 3 minutes
      setTimeout(() => {
        clearInterval(poll)
        setFixLoading(prev => ({ ...prev, [rec.id!]: false }))
      }, 180_000)

    } catch {
      setFixLoading(prev => ({ ...prev, [rec.id!]: false }))
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
              Click "Generate recommendations" to get personalised AI visibility advice.
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
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">{error}</div>
        )}

        {recs && !loading && (
          <div className="space-y-3">
            {[...recs].sort((a, b) => priorityRankOrder(a.priority_rank ?? 'do_next') - priorityRankOrder(b.priority_rank ?? 'do_next')).map((rec, i) => {
              const rank = rec.priority_rank ?? 'do_next'
              const rankStyle = RANK_STYLE[rank]
              const fixType = rec.type
              const isFixLoading = rec.id ? fixLoading[rec.id] : false
              const asset = rec.id ? assets[rec.id] : null

              return (
                <div key={i} className="border border-gray-100 rounded-lg p-4 bg-gray-50 hover:border-gray-200 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-20 mt-0.5">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full inline-block" style={{ background: rankStyle.bg, color: rankStyle.color }}>
                        {PRIORITY_RANK_LABEL[rank]}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-1 leading-tight">
                        Impact {(rec.impact_level ?? rec.priority)} · Effort {rec.effort ?? '—'}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="text-sm font-semibold text-gray-900">{rec.title}</div>
                        {fixType && rec.id && (
                          <button
                            onClick={() => generateFix(rec)}
                            disabled={isFixLoading || !!asset}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md flex-shrink-0 transition-colors ${
                              asset
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default'
                                : 'bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50'
                            }`}
                          >
                            {isFixLoading
                              ? <><Spinner className="w-3 h-3" /> Generating…</>
                              : asset
                              ? <><Check className="w-3 h-3" /> Generated</>
                              : <><Wrench className="w-3 h-3" /> Fix</>
                            }
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-gray-700 mb-2 leading-relaxed">
                        <span className="font-semibold text-gray-500 text-xs uppercase tracking-wide">What: </span>
                        {rec.what}
                      </div>
                      <div className="text-sm text-gray-600 mb-2 leading-relaxed">
                        <span className="font-semibold text-gray-500 text-xs uppercase tracking-wide">Why: </span>
                        {rec.why}
                      </div>
                      {rec.evidence && (
                        <div className="text-sm text-gray-600 mb-2 leading-relaxed">
                          <span className="font-semibold text-gray-500 text-xs uppercase tracking-wide">Evidence: </span>
                          {rec.evidence}
                        </div>
                      )}
                      <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-1 rounded-md">
                        <span>📈</span>
                        {rec.impact}
                      </div>

                      {asset && (
                        <AssetPreview
                          asset={asset}
                          onRegenerate={() => generateFix(rec)}
                          loading={isFixLoading}
                        />
                      )}
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
