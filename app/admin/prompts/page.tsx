import { cookies } from 'next/headers'
import { PromptEditor } from '@/components/admin/prompt-editor'
import { ADMIN_COPY, type AdminLang } from '@/lib/admin-copy'

export const dynamic = 'force-dynamic'

export default async function PromptsPage() {
  const cookieStore = await cookies()
  const lang = (cookieStore.get('finded_lang')?.value ?? 'nl') as AdminLang
  const t = ADMIN_COPY[lang]
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.prompts.title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          The query corpus audits run against. Edits override the built-in
          templates without a deploy; leave a section untouched to keep the
          shipped defaults.
        </p>
      </div>
      <PromptEditor />
    </div>
  )
}
