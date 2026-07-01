import { cookies } from 'next/headers'
import { AdminSidebar } from '@/components/admin/sidebar'
import { AdminLangProvider } from '@/components/admin/lang-context'
import type { AdminLang } from '@/lib/admin-copy'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const lang = (cookieStore.get('finded_lang')?.value ?? 'nl') as AdminLang

  return (
    <AdminLangProvider lang={lang}>
      <div className="md:flex min-h-screen bg-[#F1E8D7]">
        <AdminSidebar />
        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </AdminLangProvider>
  )
}
