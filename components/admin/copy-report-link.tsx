'use client'

import { useState } from 'react'
import { Link2, Check } from 'lucide-react'

export function CopyReportLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const url = `${window.location.origin}/report/${slug}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white text-gray-600 hover:border-gray-400 transition-colors"
    >
      {copied
        ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!</>
        : <><Link2 className="w-3.5 h-3.5" /> Copy report link</>
      }
    </button>
  )
}
