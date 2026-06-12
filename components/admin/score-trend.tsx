'use client'

import { useEffect, useState } from 'react'

interface ScorePoint {
  snapshot_date: string
  visibility_score: number
  opportunity_score: number
  mention_frequency: number
}

interface Props {
  restaurantId: string
}

export function ScoreTrend({ restaurantId }: Props) {
  const [history, setHistory] = useState<ScorePoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/score-history?restaurant_id=${restaurantId}`)
      .then(r => r.json())
      .then(d => {
        setHistory(d.history ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [restaurantId])

  if (loading) return null
  if (history.length < 2) return null

  const width = 600
  const height = 120
  const padding = { top: 12, right: 16, bottom: 24, left: 32 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const scores = history.map(h => h.visibility_score)
  const minScore = Math.max(0, Math.min(...scores) - 10)
  const maxScore = Math.min(100, Math.max(...scores) + 10)

  const x = (i: number) => padding.left + (i / (history.length - 1)) * chartW
  const y = (score: number) => padding.top + chartH - ((score - minScore) / (maxScore - minScore)) * chartH

  const pathD = history.map((h, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(h.visibility_score)}`).join(' ')
  const areaD = `${pathD} L ${x(history.length - 1)} ${padding.top + chartH} L ${padding.left} ${padding.top + chartH} Z`

  const latest = history[history.length - 1]
  const previous = history[history.length - 2]
  const change = Math.round(latest.visibility_score - previous.visibility_score)
  const trending = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-5">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900">Visibility trend</h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            trending === 'up' ? 'bg-emerald-50 text-emerald-600' :
            trending === 'down' ? 'bg-red-50 text-red-500' :
            'bg-gray-100 text-gray-500'
          }`}>
            {trending === 'up' ? `↑ +${change}` : trending === 'down' ? `↓ ${change}` : '→ No change'}
          </span>
        </div>
        <span className="text-xs text-gray-400">{history.length} audits</span>
      </div>
      <div className="px-5 py-4">
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ height: 120 }}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(v => {
            if (v < minScore || v > maxScore) return null
            const yPos = y(v)
            return (
              <g key={v}>
                <line x1={padding.left} y1={yPos} x2={padding.left + chartW} y2={yPos} stroke="#f2f1ee" strokeWidth="1" />
                <text x={padding.left - 4} y={yPos} textAnchor="end" dominantBaseline="central" fontSize="9" fill="#b0aea8">{v}</text>
              </g>
            )
          })}

          {/* Area fill */}
          <path d={areaD} fill="#111110" fillOpacity="0.04" />

          {/* Line */}
          <path d={pathD} fill="none" stroke="#111110" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data points */}
          {history.map((h, i) => (
            <g key={i}>
              <circle cx={x(i)} cy={y(h.visibility_score)} r="3" fill="#fff" stroke="#111110" strokeWidth="1.5" />
              <text x={x(i)} y={padding.top + chartH + 14} textAnchor="middle" fontSize="9" fill="#b0aea8">
                {new Date(h.snapshot_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </text>
            </g>
          ))}

          {/* Latest value label */}
          <text
            x={x(history.length - 1)}
            y={y(latest.visibility_score) - 8}
            textAnchor="middle"
            fontSize="10"
            fontWeight="600"
            fill="#111110"
          >
            {Math.round(latest.visibility_score)}
          </text>
        </svg>
      </div>
    </div>
  )
}
