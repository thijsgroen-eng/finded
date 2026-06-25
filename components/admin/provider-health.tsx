'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, Button } from '@/components/ui'
import { Activity, Loader2 } from 'lucide-react'

interface Provider {
  model: string
  label: string
  configured: boolean
  enabled?: boolean
  band: 'green' | 'yellow' | 'red' | 'unknown'
  total?: number
  completed?: number
  rate?: number
  error?: string | null
  duration_ms?: number
}

const BAND_STYLE: Record<string, { dot: string; text: string; label: string }> = {
  green:   { dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Reachable' },
  yellow:  { dot: 'bg-amber-500',   text: 'text-amber-700',   label: 'Degraded' },
  red:     { dot: 'bg-red-500',     text: 'text-red-600',     label: 'Failing' },
  unknown: { dot: 'bg-gray-300',    text: 'text-gray-400',    label: 'No recent data' },
}

/** Admin panel: at-a-glance reachability of each AI provider. */
export function ProviderHealth() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [mode, setMode] = useState<'recent' | 'live'>('recent')
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)

  const load = useCallback(async (live = false) => {
    if (live) setTesting(true); else setLoading(true)
    try {
      const res = await fetch(`/api/admin/provider-health${live ? '?test=1' : ''}`)
      const json = await res.json()
      setProviders(json.providers ?? [])
      setMode(json.mode ?? 'recent')
    } catch { /* leave prior state */ }
    finally { setLoading(false); setTesting(false) }
  }, [])

  useEffect(() => { load(false) }, [load])

  return (
    <Card className="mb-5">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-900">AI provider health</span>
          <span className="text-xs text-gray-400">
            {mode === 'live' ? 'live test' : 'recent runs'}
          </span>
        </div>
        <Button variant="secondary" size="sm" onClick={() => load(true)} disabled={testing}>
          {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Test live
        </Button>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="text-sm text-gray-400 py-2">Checking…</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {providers.map((p) => {
              const disabled = p.enabled === false
              const st = disabled ? { dot: 'bg-gray-300', text: 'text-gray-400', label: 'Disabled (off in Settings)' } : (BAND_STYLE[p.band] ?? BAND_STYLE.unknown)
              return (
                <div key={p.model} className={`border border-gray-100 rounded-lg p-3 ${disabled ? 'opacity-60' : ''}`} title={p.error ?? undefined}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
                    <span className="text-sm font-semibold text-gray-900">{p.label}</span>
                  </div>
                  <div className={`text-xs font-medium ${st.text}`}>{st.label}</div>
                  {!disabled && mode === 'recent' && (p.total ?? 0) > 0 && (
                    <div className="text-xs text-gray-400 mt-1">{p.completed}/{p.total} ok ({Math.round((p.rate ?? 0) * 100)}%)</div>
                  )}
                  {mode === 'live' && p.duration_ms != null && p.band === 'green' && (
                    <div className="text-xs text-gray-400 mt-1">{p.duration_ms} ms</div>
                  )}
                  {!p.configured && <div className="text-xs text-gray-400 mt-1">no API key</div>}
                  {p.error && (
                    <div className="text-xs text-red-500 mt-1 line-clamp-2">{p.error}</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}
