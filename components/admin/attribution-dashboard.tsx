'use client'
import { useState } from 'react'
import {
  TrendingUp, TrendingDown, Minus, AlertCircle,
  Info, ExternalLink, Loader2, CheckCircle2
} from 'lucide-react'
import type { AttributionResult, ConfidenceLevel } from '@/lib/engine/attribution-engine'

// ── Sub-components ────────────────────────────────────────────────────────────

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const config = {
    high:              { label: 'High confidence',        color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    medium:            { label: 'Medium confidence',      color: 'bg-amber-50 text-amber-700 border-amber-200' },
    low:               { label: 'Low confidence',         color: 'bg-orange-50 text-orange-700 border-orange-200' },
    insufficient_data: { label: 'Insufficient data',      color: 'bg-gray-100 text-gray-500 border-gray-200' },
  }
  const c = config[level]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.color}`}>
      <Info className="w-3 h-3" />
      {c.label}
    </span>
  )
}

function MetricCard({
  label, measured, estimatedMin, estimatedMax,
  unit = '', confidence, isMeasured = false,
}: {
  label: string
  measured: number | null
  estimatedMin: number
  estimatedMax: number
  unit?: string
  confidence: ConfidenceLevel
  isMeasured?: boolean
}) {
  const hasData = measured !== null || estimatedMax > 0
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      {!hasData ? (
        <p className="mt-2 text-sm text-gray-400">No data yet</p>
      ) : (
        <>
          {measured !== null && isMeasured ? (
            <div className="mt-2">
              <p className="text-2xl font-bold text-gray-900">{unit}{measured.toLocaleString()}</p>
              <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Measured directly
              </p>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-2xl font-bold text-gray-900">
                {unit}{estimatedMin.toLocaleString()}–{unit}{estimatedMax.toLocaleString()}
              </p>
              <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                <Info className="w-3 h-3" /> Estimated range
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function LiftIndicator({ pct, label }: { pct: number | null; label: string }) {
  if (pct === null) return (
    <div className="flex items-center gap-2 text-sm text-gray-400">
      <Minus className="w-4 h-4" />
      <span>{label}: no data</span>
    </div>
  )
  const positive = pct >= 0
  return (
    <div className={`flex items-center gap-2 text-sm font-medium ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
      {positive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
      <span>{label}: {positive ? '+' : ''}{Math.round(pct)}%</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  restaurantId: string
  restaurantName: string
  result?: AttributionResult | null
  hasAnalyticsIntegration: boolean
}

export function AttributionDashboard({ restaurantId, restaurantName, result, hasAnalyticsIntegration }: Props) {
  const [showCaveats, setShowCaveats] = useState(false)
  const [connecting, setConnecting] = useState(false)

  if (!result) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-800">Revenue impact not yet calculated</h3>
        <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
          Run at least two audits to measure before/after recommendation changes and estimate revenue impact.
        </p>
      </div>
    )
  }

  const { measured, estimated, confidence, summary } = result

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">AI Recommendation Impact</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Estimated business impact from changes in AI recommendation frequency
          </p>
        </div>
        <ConfidenceBadge level={confidence.level} />
      </div>

      {/* Headline */}
      <div className={`rounded-xl border p-5 ${
        measured.recommendationLiftPct > 0
          ? 'bg-emerald-50 border-emerald-200'
          : measured.recommendationLiftPct < 0
          ? 'bg-red-50 border-red-200'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <p className="text-base font-semibold text-gray-900">{summary.headline}</p>
        <p className="text-sm text-gray-600 mt-1">{summary.subheadline}</p>
        <div className="mt-3 space-y-1.5">
          {summary.keyFindings.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Lift indicators */}
      <div className="flex flex-wrap gap-4 px-1">
        <LiftIndicator pct={measured.recommendationLiftPct} label="Recommendation frequency" />
        <LiftIndicator pct={measured.aiTrafficLiftPct}      label="AI referral traffic" />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="AI sessions (measured)"
          measured={measured.aiSessionsAfter}
          estimatedMin={measured.aiSessionsAfter}
          estimatedMax={measured.aiSessionsAfter}
          confidence={confidence.level}
          isMeasured={hasAnalyticsIntegration}
        />
        <MetricCard
          label="AI-influenced visitors"
          measured={null}
          estimatedMin={estimated.additionalVisitorsMin}
          estimatedMax={estimated.additionalVisitorsMax}
          confidence={confidence.level}
        />
        <MetricCard
          label="Additional leads"
          measured={measured.aiConversionsAfter > 0 ? measured.aiConversionsAfter : null}
          estimatedMin={estimated.additionalLeadsMin}
          estimatedMax={estimated.additionalLeadsMax}
          confidence={confidence.level}
          isMeasured={hasAnalyticsIntegration}
        />
        <MetricCard
          label="Revenue impact"
          measured={measured.measuredRevenue > 0 ? measured.measuredRevenue : null}
          estimatedMin={estimated.revenueMin}
          estimatedMax={estimated.revenueMax}
          unit="€"
          confidence={confidence.level}
          isMeasured={measured.measuredRevenue > 0}
        />
      </div>

      {/* Confidence breakdown */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">How this was calculated</h3>
          <button
            onClick={() => setShowCaveats(!showCaveats)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            {showCaveats ? 'Hide' : 'Show'} assumptions & limitations
          </button>
        </div>

        <div className="space-y-1.5">
          {confidence.reasons.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
              {r}
            </div>
          ))}
        </div>

        {showCaveats && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-1.5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Limitations & assumptions</p>
            {confidence.limitations.map((l, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {l}
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
              Dark traffic multiplier: {estimated.darkTrafficMultiplier}x (conservative: 2x, optimistic: 5x).
              Revenue range uses this multiplier applied to tracked AI sessions × assumed conversion rate.
            </div>
          </div>
        )}
      </div>

      {/* Analytics integration CTA if missing */}
      {!hasAnalyticsIntegration && (
        <div className="border border-dashed border-gray-300 rounded-xl p-5 flex items-start gap-4">
          <div className="p-2 bg-blue-50 rounded-lg shrink-0">
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">Connect Google Analytics for measured data</p>
            <p className="text-xs text-gray-500 mt-1">
              Right now revenue impact is estimated. With GA4 connected, we can show actual AI referral sessions,
              conversions, and revenue — moving from estimated to measured.
            </p>
          </div>
          <button
            onClick={() => setConnecting(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-700"
          >
            {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
            Connect
          </button>
        </div>
      )}
    </div>
  )
}
