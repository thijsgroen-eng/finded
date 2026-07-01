'use client'

import { useState, useCallback, useEffect } from 'react'
import { Store, Search, Download, Sparkles, ChevronDown, ChevronUp, Globe, Tag, Star, Package, X, Check, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { MarketplacePrompt, MarketplacePack } from '@/lib/marketplace/catalog'
import { useAdminT } from '@/components/admin/lang-context'

type PromptWithPack = MarketplacePrompt & { packId: string; packName: string; packNameNl: string }

export default function MarketplacePage() {
  const t = useAdminT().marketplace

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterLang, setFilterLang] = useState('')
  const [prompts, setPrompts] = useState<PromptWithPack[]>([])
  const [packs, setPacks] = useState<MarketplacePack[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'prompts' | 'packs'>('packs')

  const [preview, setPreview] = useState<PromptWithPack | null>(null)
  const [importTemplate, setImportTemplate] = useState('')
  const [importCategory, setImportCategory] = useState('')
  const [importing, setImporting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [imported, setImported] = useState<Set<string>>(new Set())

  const [optimizing, setOptimizing] = useState(false)
  const [optimizeGoal, setOptimizeGoal] = useState('clarity')
  const [optimized, setOptimized] = useState<string | null>(null)

  const [expandedPack, setExpandedPack] = useState<string | null>(null)
  const [packImporting, setPackImporting] = useState<string | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterCategory) params.set('category', filterCategory)
    if (filterLang) params.set('lang', filterLang)
    const res = await fetch(`/api/admin/prompts/marketplace?${params}`)
    if (res.ok) {
      const j = await res.json()
      setPrompts(j.prompts)
      setPacks(j.packs)
    }
    setLoading(false)
  }, [search, filterCategory, filterLang])

  useEffect(() => { load() }, [load])

  function openPreview(p: PromptWithPack) {
    setPreview(p)
    setImportTemplate(p.template)
    setImportCategory(p.category)
    setOptimized(null)
  }

  async function importPrompt() {
    if (!preview) return
    setImporting(true)
    try {
      const res = await fetch('/api/admin/prompts/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          promptId: preview.id,
          language: preview.language,
          category: importCategory,
          template: optimized ?? importTemplate,
          title: preview.title,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setImported(prev => new Set([...prev, preview.id]))
      showToast(j.message, true)
      setPreview(null)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Import failed', false)
    } finally {
      setImporting(false)
    }
  }

  async function importPack(packId: string) {
    setPackImporting(packId)
    try {
      const res = await fetch('/api/admin/prompts/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import_pack', packId }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      const pack = packs.find(p => p.id === packId)
      if (pack) setImported(prev => new Set([...prev, ...pack.prompts.map(p => p.id)]))
      showToast(j.message, true)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Import failed', false)
    } finally {
      setPackImporting(null)
    }
  }

  async function optimize() {
    setOptimizing(true)
    setOptimized(null)
    try {
      const res = await fetch('/api/admin/prompts/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'optimize', template: importTemplate, goal: optimizeGoal }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setOptimized(j.optimized)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Optimize failed', false)
    } finally {
      setOptimizing(false)
    }
  }

  const packPromptsInLang = (pack: MarketplacePack) =>
    filterLang ? pack.prompts.filter(p => p.language === filterLang) : pack.prompts

  const catLabel = (cat: string) => t.categoryLabels[cat as keyof typeof t.categoryLabels] ?? cat

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/prompts" className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> {t.backToEditor}
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="w-6 h-6 text-gray-400" /> {t.title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
        </div>
      </div>

      {/* View toggle + filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button onClick={() => setView('packs')} className={`px-4 py-2 text-sm font-medium ${view === 'packs' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Package className="w-3.5 h-3.5 inline mr-1.5" />{t.viewPacks}
          </button>
          <button onClick={() => setView('prompts')} className={`px-4 py-2 text-sm font-medium ${view === 'prompts' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Star className="w-3.5 h-3.5 inline mr-1.5" />{t.viewPrompts}
          </button>
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.searchPlaceholder}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
        </div>

        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600">
          <option value="">{t.allCategories}</option>
          {Object.entries(t.categoryLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <select value={filterLang} onChange={e => setFilterLang(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600">
          <option value="">{t.allLanguages}</option>
          <option value="en">English</option>
          <option value="nl">Nederlands</option>
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      )}

      {/* Packs view */}
      {!loading && view === 'packs' && (
        <div className="grid gap-4">
          {packs.map(pack => {
            const packPrompts = packPromptsInLang(pack)
            const isExpanded = expandedPack === pack.id
            const allImported = packPrompts.length > 0 && packPrompts.every(p => imported.has(p.id))
            return (
              <div key={pack.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-gray-900">{pack.name}</h3>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{pack.category}</span>
                      <span className="text-xs text-gray-400">v{pack.version} · {pack.author}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2 line-clamp-2">{pack.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {pack.tags.slice(0, 5).map(tag => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100 text-gray-500">
                          <Tag className="w-2.5 h-2.5 inline mr-1" />{tag}
                        </span>
                      ))}
                      <span className="text-xs text-gray-400">{packPrompts.length} prompt{packPrompts.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {allImported ? (
                      <span className="text-xs font-medium text-emerald-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {t.imported}</span>
                    ) : (
                      <button onClick={() => importPack(pack.id)} disabled={packImporting === pack.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-60">
                        {packImporting === pack.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        {t.importPack}
                      </button>
                    )}
                    <button onClick={() => setExpandedPack(isExpanded ? null : pack.id)}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-gray-50">
                    {packPrompts.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-gray-400">{t.noPromptsForLang}</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Prompt</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t.categoryLabels.category}</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Lang</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">{t.estimatedTokens}</th>
                            <th className="px-5 py-2.5"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {packPrompts.map(p => (
                            <tr key={p.id} className="hover:bg-gray-50">
                              <td className="px-5 py-3">
                                <div className="font-medium text-gray-900">{p.title}</div>
                                <div className="text-xs text-gray-400 truncate max-w-xs mt-0.5">{p.template}</div>
                              </td>
                              <td className="px-4 py-3 text-gray-500">{catLabel(p.category)}</td>
                              <td className="px-4 py-3">
                                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                  <Globe className="w-2.5 h-2.5 inline mr-0.5" />{p.language}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-400 text-xs">~{p.estimatedTokens}</td>
                              <td className="px-5 py-3 text-right">
                                {imported.has(p.id) ? (
                                  <span className="text-xs text-emerald-600 font-medium flex items-center justify-end gap-1"><Check className="w-3 h-3" /> {t.imported}</span>
                                ) : (
                                  <button onClick={() => openPreview({ ...p, packId: pack.id, packName: pack.name, packNameNl: pack.nameNl })}
                                    className="text-xs font-medium text-gray-700 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50">
                                    {t.previewImport}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Prompts browse view */}
      {!loading && view === 'prompts' && (
        <div>
          <p className="text-xs text-gray-400 mb-3">{t.promptsFound(prompts.length)}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {prompts.map(p => (
              <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{p.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{p.packName}</div>
                  </div>
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">
                    <Globe className="w-2.5 h-2.5 inline mr-0.5" />{p.language}
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>
                <div className="font-mono text-xs bg-gray-50 rounded-lg px-3 py-2 text-gray-700 leading-relaxed line-clamp-2">{p.template}</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">{catLabel(p.category)}</span>
                  <span className="text-xs text-gray-400">~{p.estimatedTokens} tokens</span>
                </div>
                <div className="flex gap-2 mt-auto pt-1">
                  {imported.has(p.id) ? (
                    <span className="text-xs font-medium text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" /> {t.imported}</span>
                  ) : (
                    <button onClick={() => openPreview(p)}
                      className="flex-1 text-xs font-medium bg-gray-900 text-white rounded-lg py-1.5 hover:bg-gray-700">
                      {t.previewImport}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {prompts.length === 0 && (
              <div className="col-span-3 py-12 text-center text-gray-400 text-sm">{t.noPromptsMatch}</div>
            )}
          </div>
        </div>
      )}

      {/* Import preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setPreview(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-start justify-between">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">{preview.title}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{preview.packName}</p>
              </div>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-gray-600">{preview.description}</p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{t.allCategories.replace('All ', '')}</div>
                  <div>{catLabel(preview.category)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Language</div>
                  <div>{preview.language === 'nl' ? 'Nederlands' : 'English'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{t.estimatedTokens}</div>
                  <div>~{preview.estimatedTokens}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{t.difficulty}</div>
                  <div className="capitalize">{preview.difficulty}</div>
                </div>
              </div>

              {preview.useCases.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t.useCases}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {preview.useCases.map(u => (
                      <span key={u} className="text-xs px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg text-gray-600">{u}</span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t.templateLabel}</div>
                <textarea value={importTemplate} onChange={e => { setImportTemplate(e.target.value); setOptimized(null) }}
                  rows={3} className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 resize-none" />
                <p className="text-xs text-gray-400 mt-1">{t.placeholdersNote} <code className="bg-gray-100 px-1 rounded">{'{location}'}</code> <code className="bg-gray-100 px-1 rounded">{'{businessType}'}</code> <code className="bg-gray-100 px-1 rounded">{'{subtype}'}</code></p>
              </div>

              <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-gray-700">{t.optimizeTitle}</span>
                </div>
                <div className="flex gap-2 mb-3">
                  <select value={optimizeGoal} onChange={e => setOptimizeGoal(e.target.value)}
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white">
                    {Object.entries(t.optimizeGoals).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <button onClick={optimize} disabled={optimizing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-60">
                    {optimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {t.optimize}
                  </button>
                </div>
                {optimized && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t.optimizedVersion}</div>
                    <div className="font-mono text-xs bg-white border border-gray-200 rounded-lg p-3 text-gray-700 leading-relaxed">{optimized}</div>
                    <div className="flex gap-2">
                      <button onClick={() => { setImportTemplate(optimized); setOptimized(null) }}
                        className="text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-lg px-2.5 py-1 hover:bg-emerald-100">
                        {t.useThisVersion}
                      </button>
                      <button onClick={() => setOptimized(null)} className="text-xs font-medium text-gray-500 hover:text-gray-700">{t.discard}</button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t.importIntoCategory}</div>
                <select value={importCategory} onChange={e => setImportCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10">
                  {Object.entries(t.categoryLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">{t.draftNote}</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setPreview(null)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">{t.cancel}</button>
              <button onClick={importPrompt} disabled={importing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-60">
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {t.importAsDraft}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white z-50 ${toast.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
