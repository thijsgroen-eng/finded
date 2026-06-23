'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Building2, ClipboardList,
  Upload, Users, BarChart2, Plus, MessageSquareText
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/admin/restaurants', label: 'Entities',    icon: Building2 },
  { href: '/admin/audits',      label: 'Audits',      icon: ClipboardList },
  { href: '/admin/prompts',     label: 'Prompts',     icon: MessageSquareText },
  { href: '/admin/analytics',   label: 'Analytics',   icon: BarChart2 },
  { href: '/admin/leads',       label: 'Leads',       icon: Users },
  { href: '/admin/upload',      label: 'Bulk Import', icon: Upload },
]

export function AdminSidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-56 min-h-screen bg-gray-950 text-gray-300 flex flex-col flex-shrink-0">
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
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-white text-gray-900 text-sm font-semibold hover:bg-gray-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New audit
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
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

      <div className="px-5 py-4 border-t border-gray-800">
        <p className="text-xs text-gray-600">Finded Platform v1.0</p>
      </div>
    </aside>
  )
}
