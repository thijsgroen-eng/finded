'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Building2, ClipboardList,
  Upload, Users, BarChart2, Plus, MessageSquareText,
  Menu, X, LogOut, Inbox, Settings, Lightbulb, ShieldCheck, HeartHandshake
} from 'lucide-react'
import { useAdminT } from '@/components/admin/lang-context'

async function logout() {
  await fetch('/api/admin/login', { method: 'DELETE' })
  window.location.href = '/login'
}

function LangToggle() {
  const router = useRouter()
  const [lang, setLang] = useState<'nl' | 'en'>('nl')

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)finded_lang=([^;]+)/)
    if (match) setLang(match[1] as 'nl' | 'en')
  }, [])

  function toggle() {
    const next = lang === 'nl' ? 'en' : 'nl'
    document.cookie = `finded_lang=${next}; path=/; max-age=31536000`
    setLang(next)
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-[rgba(36,28,19,0.55)] hover:text-[#241C13] hover:bg-[rgba(36,28,19,0.06)] transition-colors border border-[rgba(36,28,19,0.12)]"
      title={lang === 'nl' ? 'Switch to English' : 'Overschakelen naar Nederlands'}
    >
      {lang === 'nl' ? '🇳🇱 NL' : '🇬🇧 EN'}
    </button>
  )
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const t = useAdminT()

  const NAV_ITEMS = [
    { href: '/admin/dashboard',   label: t.nav.dashboard,   icon: LayoutDashboard },
    { href: '/admin/restaurants', label: t.nav.restaurants, icon: Building2 },
    { href: '/admin/clients',     label: t.nav.clients,     icon: HeartHandshake },
    { href: '/admin/audits',      label: t.nav.audits,      icon: ClipboardList },
    { href: '/admin/requests',    label: t.nav.requests,    icon: Inbox },
    { href: '/admin/prompts',     label: t.nav.prompts,     icon: MessageSquareText },
    { href: '/admin/analytics',   label: t.nav.analytics,   icon: BarChart2 },
    { href: '/admin/insights',    label: t.nav.insights,    icon: Lightbulb },
    { href: '/admin/leads',       label: t.nav.leads,       icon: Users },
    { href: '/admin/upload',      label: t.nav.upload,      icon: Upload },
    { href: '/admin/settings',    label: t.nav.settings,    icon: Settings },
    { href: '/admin/users',       label: t.nav.users,       icon: ShieldCheck },
  ]

  return (
    <>
      <div className="px-5 py-5 border-b border-[rgba(36,28,19,0.12)]">
        <div className="flex items-baseline gap-1">
          <span className="text-[#241C13] font-bold text-lg tracking-tight">Finded</span>
          <span className="text-xs text-[rgba(36,28,19,0.46)] font-medium">admin</span>
        </div>
      </div>

      <div className="px-3 py-3 border-b border-[rgba(36,28,19,0.12)]">
        <Link
          href="/admin/new"
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-semibold transition-colors text-white"
          style={{ background: 'linear-gradient(135deg, #C8804E 0%, #B5683A 50%, #9A5530 100%)' }}
        >
          <Plus className="w-4 h-4" />
          {t.nav.newAudit}
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'text-[#241C13] bg-[rgba(181,104,58,0.16)] border border-[rgba(181,104,58,0.3)]'
                  : 'text-[rgba(36,28,19,0.60)] hover:text-[#241C13] hover:bg-[rgba(36,28,19,0.06)] border border-transparent'
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-[#B5683A]' : '')} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-3 border-t border-[rgba(36,28,19,0.12)] space-y-1">
        <div className="px-3 py-1">
          <LangToggle />
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-[rgba(36,28,19,0.60)] hover:text-[#241C13] hover:bg-[rgba(36,28,19,0.06)] transition-colors border border-transparent"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {t.nav.logout}
        </button>
        <p className="text-xs text-[rgba(36,28,19,0.36)] px-3 pt-1">Finded Platform v1.0</p>
      </div>
    </>
  )
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-[#E7DAC1] text-[#241C13] border-b border-[rgba(36,28,19,0.12)]">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="p-1.5 -ml-1.5 rounded-md hover:bg-gray-800/60 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-baseline gap-1">
          <span className="text-[#241C13] font-bold tracking-tight">Finded</span>
          <span className="text-xs text-[rgba(36,28,19,0.46)] font-medium">admin</span>
        </div>
      </header>

      <aside className="hidden md:flex w-56 min-h-screen bg-[#E7DAC1] text-[#241C13] flex-col flex-shrink-0 border-r border-[rgba(36,28,19,0.12)]">
        <SidebarBody />
      </aside>

      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-64 max-w-[80%] bg-[#E7DAC1] text-[#241C13] flex flex-col shadow-xl">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-3 p-1.5 rounded-md text-[rgba(36,28,19,0.50)] hover:text-[#241C13] hover:bg-[rgba(36,28,19,0.06)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarBody onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}
