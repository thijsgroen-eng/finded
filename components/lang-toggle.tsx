'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Lang = 'nl' | 'en'

/**
 * Guest-facing NL/EN language switch. Writes the `finded_lang` cookie and
 * refreshes so server components re-render in the chosen language.
 * `tone="dark"` for dark backgrounds; default suits light surfaces.
 */
export function LangToggle({ current, tone = 'dark', onChange }: { current: Lang; tone?: 'dark' | 'light'; onChange?: (l: Lang) => void }) {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>(current)

  function choose(l: Lang) {
    if (l === lang) return
    setLang(l)
    document.cookie = `finded_lang=${l}; path=/; max-age=31536000; samesite=lax`
    // Client pages pass onChange to re-render their own state; server pages refresh.
    if (onChange) onChange(l)
    else router.refresh()
  }

  const dark = tone === 'dark'
  const wrap: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 2, padding: 2, borderRadius: 9,
    border: `1px solid ${dark ? 'rgba(255,255,255,0.14)' : '#e5e7eb'}`,
    background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
  }
  const pill = (active: boolean): React.CSSProperties => ({
    fontSize: 12, fontWeight: 700, padding: '4px 9px', borderRadius: 7, cursor: 'pointer', border: 'none',
    background: active ? (dark ? 'rgba(124,92,255,0.25)' : '#111827') : 'transparent',
    color: active ? (dark ? '#fff' : '#fff') : (dark ? '#9a9fb6' : '#6b7280'),
  })

  return (
    <span style={wrap} role="group" aria-label="Language">
      {(['nl', 'en'] as Lang[]).map((l) => (
        <button key={l} type="button" onClick={() => choose(l)} style={pill(lang === l)} aria-pressed={lang === l}>
          {l.toUpperCase()}
        </button>
      ))}
    </span>
  )
}
