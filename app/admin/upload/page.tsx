'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent, Button, Spinner, Badge } from '@/components/ui'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, ArrowRight, Database } from 'lucide-react'

interface Preview {
  mode: 'preview'
  columns: string[]
  summary: { total: number; valid: number; invalid: number; duplicates_in_file: number; already_in_db: number; new: number }
  invalid: Array<{ row: number; reason: string }>
  sample: Array<{ name: string; city: string; cuisine: string | null; website: string | null }>
}
interface Committed {
  mode: 'commit'
  summary: { total: number; valid: number; inserted: number; skipped_existing: number; duplicates_in_file: number; invalid: number; errors: number }
  errors: string[]
}

export default function BulkImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [tag, setTag] = useState('')
  const [country, setCountry] = useState('Netherlands')
  const [phase, setPhase] = useState<'select' | 'previewing' | 'preview' | 'committing' | 'done'>('select')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [done, setDone] = useState<Committed | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function validateAndSetFile(f: File) {
    const name = f.name.toLowerCase()
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      setError('Only .csv and .xlsx files are supported'); return
    }
    setFile(f); setError(null); setPreview(null); setDone(null); setPhase('select')
  }

  async function runPreview() {
    if (!file) return
    setPhase('previewing'); setError(null)
    const form = new FormData()
    form.append('file', file); form.append('mode', 'preview'); form.append('default_country', country)
    try {
      const res = await fetch('/api/admin/import', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Preview failed'); setPhase('select'); return }
      setPreview(json); setPhase('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed'); setPhase('select')
    }
  }

  async function commit() {
    if (!file) return
    setPhase('committing'); setError(null)
    const form = new FormData()
    form.append('file', file); form.append('mode', 'commit'); form.append('default_country', country)
    if (tag) form.append('tag', tag)
    try {
      const res = await fetch('/api/admin/import', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Import failed'); setPhase('preview'); return }
      setDone(json); setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed'); setPhase('preview')
    }
  }

  function reset() {
    setFile(null); setPreview(null); setDone(null); setError(null); setTag(''); setPhase('select')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bulk import</h1>
        <p className="text-sm text-gray-500 mt-1">
          Import restaurants from CSV or Excel. Built for large files — we validate, dedupe, and
          preview before writing anything.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6 text-xs font-medium">
        {[['1', 'Upload'], ['2', 'Preview & dedupe'], ['3', 'Import']].map(([n, label], i) => {
          const active = (phase === 'select' && i === 0) || ((phase === 'previewing' || phase === 'preview') && i === 1) || ((phase === 'committing' || phase === 'done') && i === 2)
          const passed = (i === 0 && phase !== 'select') || (i === 1 && (phase === 'committing' || phase === 'done'))
          return (
            <div key={n} className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${active ? 'bg-gray-900 text-white' : passed ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{passed ? '✓' : n}</span>
              <span className={active ? 'text-gray-900' : 'text-gray-400'}>{label}</span>
              {i < 2 && <ArrowRight className="w-3 h-3 text-gray-300" />}
            </div>
          )
        })}
      </div>

      {/* Format guide */}
      {phase === 'select' && (
        <Card className="mb-6">
          <CardContent>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Required columns</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {['name', 'city'].map((c) => <code key={c} className="px-2 py-0.5 bg-gray-900 text-green-400 rounded text-xs font-mono">{c}</code>)}
              <span className="text-xs text-gray-400 self-center">required</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {['website', 'cuisine', 'email', 'phone', 'country'].map((c) => <code key={c} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">{c}</code>)}
              <span className="text-xs text-gray-400 self-center">optional</span>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Header variants like <code className="font-mono">restaurant_name</code>, <code className="font-mono">location</code>, <code className="font-mono">url</code> are recognised.
              Duplicates (same name + city) are removed within the file and skipped if already in the database.
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Step 1 — drop zone */}
      {phase === 'select' && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) validateAndSetFile(f) }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors mb-5 ${
              dragging ? 'border-gray-400 bg-gray-50' : file ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
          >
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) validateAndSetFile(f) }} />
            {file ? (
              <div className="flex flex-col items-center gap-3">
                <FileSpreadsheet className="w-10 h-10 text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); reset() }} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                  <X className="w-3 h-3" /> Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="w-10 h-10 text-gray-300" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Drop your CSV or Excel file here</p>
                  <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                </div>
              </div>
            )}
          </div>

          {file && (
            <div className="flex flex-wrap items-end gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Default country</label>
                <input value={country} onChange={(e) => setCountry(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-md w-44 focus:outline-none focus:ring-2 focus:ring-gray-200" />
              </div>
              <Button onClick={runPreview} className="ml-auto">
                Preview import <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </>
      )}

      {phase === 'previewing' && (
        <div className="flex items-center justify-center gap-3 py-16 text-gray-500"><Spinner className="w-6 h-6 text-gray-400" />Validating & deduping…</div>
      )}

      {/* Step 2 — preview */}
      {phase === 'preview' && preview && (
        <>
          <Card className="mb-5">
            <CardContent>
              <p className="text-sm font-semibold text-gray-900 mb-4">Dry run — nothing imported yet</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Rows in file', value: preview.summary.total, tone: 'text-gray-900' },
                  { label: 'New to import', value: preview.summary.new, tone: 'text-emerald-600' },
                  { label: 'Already in DB', value: preview.summary.already_in_db, tone: 'text-gray-500' },
                  { label: 'Duplicates in file', value: preview.summary.duplicates_in_file, tone: 'text-gray-500' },
                  { label: 'Invalid rows', value: preview.summary.invalid, tone: preview.summary.invalid ? 'text-red-600' : 'text-gray-500' },
                  { label: 'Valid', value: preview.summary.valid, tone: 'text-gray-900' },
                ].map(({ label, value, tone }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3">
                    <p className={`text-xl font-bold ${tone}`}>{value.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              {preview.columns.length > 0 && (
                <p className="text-xs text-gray-400 mt-4">Detected columns: {preview.columns.map((c) => <code key={c} className="font-mono mr-1">{c}</code>)}</p>
              )}
            </CardContent>
          </Card>

          {preview.sample.length > 0 && (
            <Card className="mb-5">
              <CardContent>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Sample of new restaurants</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-50">
                      {preview.sample.map((s, i) => (
                        <tr key={i}>
                          <td className="py-1.5 pr-4 font-medium text-gray-800">{s.name}</td>
                          <td className="py-1.5 pr-4 text-gray-500">{s.city}</td>
                          <td className="py-1.5 pr-4 text-gray-500">{s.cuisine ?? '—'}</td>
                          <td className="py-1.5 text-gray-400 text-xs">{s.website?.replace(/^https?:\/\//, '') ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {preview.invalid.length > 0 && (
            <Card className="mb-5">
              <CardContent>
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Invalid rows (skipped)</p>
                <div className="space-y-1">
                  {preview.invalid.slice(0, 10).map((inv) => (
                    <div key={inv.row} className="flex gap-2 text-xs"><Badge variant="danger">Row {inv.row}</Badge><span className="text-gray-500">{inv.reason}</span></div>
                  ))}
                  {preview.invalid.length > 10 && <p className="text-xs text-gray-400">+ {preview.invalid.length - 10} more</p>}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap items-end gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Tag this batch <span className="font-normal text-gray-400">(optional)</span></label>
              <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. amsterdam-2026"
                className="px-3 py-2 text-sm border border-gray-200 rounded-md w-56 focus:outline-none focus:ring-2 focus:ring-gray-200" />
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" onClick={reset}>Cancel</Button>
              <Button onClick={commit} disabled={preview.summary.new === 0}>
                <Database className="w-3.5 h-3.5" />Import {preview.summary.new.toLocaleString()} restaurants
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Audits are not run automatically — that would be costly at this scale. After import, open the
            Restaurant Database, filter your batch, and run audits selectively.
          </p>
        </>
      )}

      {phase === 'committing' && (
        <div className="flex items-center justify-center gap-3 py-16 text-gray-500"><Spinner className="w-6 h-6 text-gray-400" />Importing…</div>
      )}

      {/* Step 3 — done */}
      {phase === 'done' && done && (
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 mb-5">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-semibold text-gray-900">Import complete</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Imported', value: done.summary.inserted },
                { label: 'Skipped (existing)', value: done.summary.skipped_existing },
                { label: 'Duplicates in file', value: done.summary.duplicates_in_file },
                { label: 'Invalid rows', value: done.summary.invalid },
                { label: 'Rows in file', value: done.summary.total },
                { label: 'Errors', value: done.summary.errors },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xl font-bold text-gray-900">{value.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            {done.errors.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Errors</p>
                {done.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
              </div>
            )}
            <div className="flex gap-2">
              <Link href="/admin/restaurants"><Button size="sm"><Database className="w-3.5 h-3.5" />Open Restaurant Database</Button></Link>
              <Button variant="secondary" size="sm" onClick={reset}>Import another file</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
