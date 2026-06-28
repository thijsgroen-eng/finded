'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Building2, ClipboardList,
  Upload, Users, BarChart2, Plus, MessageSquareText,
  Menu, X, LogOut, Inbox, Settings, Lightbulb, ShieldCheck, HeartHandshake
} from 'lucide-react'

async function logout() {
  await fetch('/api/admin/login', { method: 'DELETE' })
  window.location.href = '/login'
}

const NAV_ITEMS = [
  { href: '/admin/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/admin/restaurants', label: 'Restaurants', icon: Building2 },
  { href: '/admin/clients',     label: 'Clients',     icon: HeartHandshake },
  { href: '/admin/audits',      label: 'Audits',      icon: ClipboardList },
  { href: '/admin/requests',    label: 'Requests',    icon: Inbox },
  { href: '/admin/prompts',     label: 'Prompts',     icon: MessageSquareText },
  { href: '/admin/analytics',   label: 'Analytics',   icon: BarChart2 },
  { href: '/admin/insights',    label: 'Insights',    icon: Lightbulb },
  { href: '/admin/leads',       label: 'Leads',       icon: Users },
  { href: '/admin/upload',      label: 'Bulk Import', icon: Upload },
  { href: '/admin/settings',    label: 'Settings',    icon: Settings },
  { href: '/admin/users',       label: 'Users',       icon: ShieldCheck },
]

/** The nav body, shared between the desktop rail and the mobile drawer. */
function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <>
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-baseline gap-1">
          <span className="text-white font-bold text-lg tracking-tight">Finded</span>
          <span className="text-xs text-gray-500 font-medium">admin</span>
        </div>
      </div>

      {/* New audit CTA */}
      <div className="px-3 py-3 border-b border-gray-800">
        <Link
          href="/admin/new"
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-white text-gray-900 text-sm font-semibold hover:bg-gray-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New audit
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
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-3 border-t border-gray-800">
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800/60 transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Log out
        </button>
        <p className="text-xs text-gray-600 px-3 pt-2">Finded Platform v1.0</p>
      </div>
    </>
  )
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setOpen(false) }, [pathname])

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  return (
    <>
      {/* Mobile top bar (hidden on md+) */}
      <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-gray-950 text-gray-100 border-b border-gray-800">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="p-1.5 -ml-1.5 rounded-md hover:bg-gray-800/60 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-baseline gap-1">
          <span className="text-white font-bold tracking-tight">Finded</span>
          <span className="text-xs text-gray-500 font-medium">admin</span>
        </div>
      </header>

      {/* Desktop rail (hidden below md) */}
      <aside className="hidden md:flex w-56 min-h-screen bg-gray-950 text-gray-300 flex-col flex-shrink-0">
        <SidebarBody />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-64 max-w-[80%] bg-gray-950 text-gray-300 flex flex-col shadow-xl">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-3 p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800/60 transition-colors"
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
