'use client'

import { useState, useRef, useCallback } from 'react'
import { Card, CardContent, Button, Spinner, Badge } from '@/components/ui'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X } from 'lucide-react'

interface UploadResult {
  summary: {
    total: number
    valid: number
    created: number
    skipped: number
    audits_queued: number
    errors: number
  }
  created: string[]
  skipped: string[]
  invalid: Array<{ row: number; reason: string }>
  errors: string[]
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [runAudits, setRunAudits] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) validateAndSetFile(dropped)
  }

  function validateAndSetFile(f: File) {
    const name = f.name.toLowerCase()
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      setError('Only .csv and .xlsx files are supported')
      return
    }
    setFile(f)
    setResult(null)
    setError(null)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError(null)
    setResult(null)

    const form = new FormData()
    form.append('file', file)
    form.append('run_audits', String(runAudits))

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Upload failed')
        return
      }
      setResult(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function reset() {
    setFile(null)
    setResult(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bulk upload</h1>
        <p className="text-sm text-gray-500 mt-1">
          Import restaurants from a CSV or Excel file and optionally queue audits for all of them.
        </p>
      </div>

      {/* Format guide */}
      <Card className="mb-6">
        <CardContent>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Required columns
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {['name', 'city'].map((col) => (
              <code key={col} className="px-2 py-0.5 bg-gray-900 text-green-400 rounded text-xs font-mono">
                {col}
              </code>
            ))}
            <span className="text-xs text-gray-400 self-center">required</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {['website', 'cuisine', 'email', 'phone'].map((col) => (
              <code key={col} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">
                {col}
              </code>
            ))}
            <span className="text-xs text-gray-400 self-center">optional</span>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Column names are flexible — variations like <code className="font-mono">restaurant_name</code>, <code className="font-mono">location</code>, <code className="font-mono">url</code> are all recognised.
            Duplicate restaurants (same name + city) are skipped.
          </p>
        </CardContent>
      </Card>

      {/* Drop zone */}
      {!result && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors mb-5 ${
            dragging
              ? 'border-gray-400 bg-gray-50'
              : file
              ? 'border-emerald-300 bg-emerald-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) validateAndSetFile(f)
            }}
          />
          {file ? (
            <div className="flex flex-col items-center gap-3">
              <FileSpreadsheet className="w-10 h-10 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); reset() }}
                className="text-xs text-red-500 hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-10 h-10 text-gray-300" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Drop your CSV or Excel file here
                </p>
                <p className="text-xs text-gray-400 mt-1">or click to browse</p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Options + submit */}
      {file && !result && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 mb-4">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={runAudits}
              onChange={(e) => setRunAudits(e.target.checked)}
              className="w-4 h-4 rounded accent-gray-900"
            />
            <span className="text-sm text-gray-700">Queue AI audits for all imported restaurants</span>
          </label>
          <Button onClick={handleUpload} disabled={uploading} size="sm">
            {uploading ? <Spinner className="w-3.5 h-3.5 text-white" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      )}

      {/* Result */}
      {result && (
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 mb-5">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-semibold text-gray-900">Upload complete</h3>
            </div>

            {/* Summary grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Rows processed', value: result.summary.total },
                { label: 'Restaurants created', value: result.summary.created },
                { label: 'Skipped (existing)', value: result.summary.skipped },
                { label: 'Invalid rows', value: result.summary.total - result.summary.valid },
                { label: 'Audits queued', value: result.summary.audits_queued },
                { label: 'Errors', value: result.summary.errors },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Details */}
            {result.invalid.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Invalid rows
                </p>
                <div className="space-y-1">
                  {result.invalid.slice(0, 10).map((inv) => (
                    <div key={inv.row} className="flex gap-2 text-xs">
                      <Badge variant="danger">Row {inv.row}</Badge>
                      <span className="text-gray-500">{inv.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">
                  Errors
                </p>
                <div className="space-y-1">
                  {result.errors.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-xs text-red-600">{e}</p>
                  ))}
                </div>
              </div>
            )}

            <Button variant="secondary" size="sm" onClick={reset}>
              Upload another file
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
