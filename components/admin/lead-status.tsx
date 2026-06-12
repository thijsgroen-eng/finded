'use client'

import { useState } from 'react'

const STATUSES = [
  { value: 'not_contacted', label: 'Not contacted', color: 'bg-gray-100 text-gray-600' },
  { value: 'email_sent',    label: 'Email sent',    color: 'bg-blue-50 text-blue-600' },
  { value: 'opened',        label: 'Opened',        color: 'bg-blue-50 text-blue-600' },
  { value: 'replied',       label: 'Replied',       color: 'bg-purple-50 text-purple-600' },
  { value: 'interested',    label: 'Interested',    color: 'bg-amber-50 text-amber-600' },
  { value: 'demo_scheduled',label: 'Demo scheduled',color: 'bg-amber-50 text-amber-600' },
  { value: 'customer',      label: 'Customer',      color: 'bg-emerald-50 text-emerald-600' },
  { value: 'lost',          label: 'Lost',          color: 'bg-red-50 text-red-500' },
]

interface Props {
  restaurantId: string
  initialStatus: string | null
  initialNotes: string | null
  initialNextFollowup: string | null
}

export function LeadStatus({ restaurantId, initialStatus, initialNotes, initialNextFollowup }: Props) {
  const [status, setStatus] = useState(initialStatus ?? 'not_contacted')
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [nextFollowup, setNextFollowup] = useState(
    initialNextFollowup ? initialNextFollowup.slice(0, 10) : ''
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const currentStatus = STATUSES.find(s => s.value === status) ?? STATUSES[0]

  async function save() {
    setSaving(true)
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          status,
          notes: notes || null,
          next_followup_at: nextFollowup ? new Date(nextFollowup).toISOString() : null,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Current status</span>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${currentStatus.color}`}>
          {currentStatus.label}
        </span>
      </div>

      <select
        value={status}
        onChange={e => setStatus(e.target.value)}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gray-300"
      >
        {STATUSES.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      <div>
        <label className="text-xs text-gray-400 mb-1 block">Next follow-up</label>
        <input
          type="date"
          value={nextFollowup}
          onChange={e => setNextFollowup(e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gray-300"
        />
      </div>

      <div>
        <label className="text-xs text-gray-400 mb-1 block">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Add notes about this lead..."
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gray-300 resize-none"
        />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full text-sm bg-gray-900 text-white rounded-lg px-4 py-2 hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
      </button>
    </div>
  )
}
