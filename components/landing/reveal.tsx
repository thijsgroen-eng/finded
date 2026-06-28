'use client'

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react'

/**
 * Scroll-reveal wrapper. Adds the `in-view` class once the element enters the
 * viewport so CSS can animate children in (the ring draw + competitor rows on
 * the marketing product shot). Honors prefers-reduced-motion by revealing
 * immediately. Progressive: if IntersectionObserver is unavailable it shows.
 */
export function Reveal({ className = '', style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced || typeof IntersectionObserver === 'undefined') { setShown(true); return }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { setShown(true); io.disconnect(); break }
    }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return <div ref={ref} className={`${className}${shown ? ' in-view' : ''}`} style={style}>{children}</div>
}
