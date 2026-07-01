import { cookies } from 'next/headers'
import Link from 'next/link'
import { PromptEditor } from '@/components/admin/prompt-editor'
import { ADMIN_COPY, type AdminLang } from '@/lib/admin-copy'
import { Store } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PromptsPage() {
  const cookieStore = await cookies()
  const lang = (cookieStore.get('finded_lang')?.value ?? 'nl') as AdminLang
  const t = ADMIN_COPY[lang]
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.prompts.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{t.prompts.pageSubtitle}</p>
        </div>
        <Link href="/admin/prompts/marketplace"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700">
          <Store className="w-4 h-4" /> {t.prompts.marketplaceBtn}
        </Link>
      </div>
      <PromptEditor />
    </div>
  )
}
