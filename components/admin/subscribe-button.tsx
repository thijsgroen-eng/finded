'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface Props {
  restaurantId: string
  plan?: 'starter' | 'pro'
  label?: string
  className?: string
}

export function SubscribeButton({ restaurantId, plan = 'starter', label, className }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: restaurantId, plan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout')
      setLoading(false)
    }
  }

  const defaultLabel = plan === 'pro' ? 'Upgrade to Pro — €299/mo' : 'Subscribe — €99/mo'

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className={className ?? 'inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 transition-colors'}
      >
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {label ?? defaultLabel}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
