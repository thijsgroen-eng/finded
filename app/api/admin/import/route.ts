import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { identityKey } from '@/lib/engine/normalize'
import { parseFile, analyze, detectColumns, type PreparedRow } from '@/lib/import/parse'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const INSERT_CHUNK = 500

/** Load all existing restaurant identity keys (name|city) once, paged. */
async function loadExistingKeys(): Promise<Set<string>> {
  const keys = new Set<string>()
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .select('name, city')
      .range(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    for (const r of data) {
      if (r.name && r.city) keys.add(`${identityKey(r.name)}|${String(r.city).toLowerCase()}`)
    }
    if (data.length < pageSize) break
  }
  return keys
}

async function readRows(file: File): Promise<{ raw: Record<string, unknown>[]; columns: string[] }> {
  const name = file.name.toLowerCase()
  let raw: Record<string, unknown>[]
  if (name.endsWith('.csv')) {
    raw = parseFile(file.name, await file.text(), null)
  } else {
    raw = parseFile(file.name, null, await file.arrayBuffer())
  }
  return { raw, columns: detectColumns(raw[0]) }
}

/**
 * POST /api/admin/import  (multipart: file, mode=preview|commit, default_country?, tag?)
 * Two-step bulk import. `preview` validates + dedupes (in-file and against the DB)
 * and returns a dry-run summary — nothing is written. `commit` performs the
 * batched insert of new restaurants. Audits are NOT auto-queued (run them
 * selectively from the Restaurant Database to control cost).
 */
export async function POST(request: NextRequest) {
  const form = await request.formData()
  const file = form.get('file') as File | null
  const mode = form.get('mode') === 'commit' ? 'commit' : 'preview'
  const defaultCountry = (form.get('default_country') as string)?.trim() || 'Netherlands'
  const tag = (form.get('tag') as string)?.trim() || ''
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  let raw: Record<string, unknown>[]
  let columns: string[]
  try {
    ({ raw, columns } = await readRows(file))
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not read file' }, { status: 400 })
  }

  const { total, invalid, prepared, duplicatesInFile } = analyze(raw, defaultCountry)
  if (prepared.length === 0 && mode === 'preview') {
    return NextResponse.json({
      mode, columns,
      summary: { total, valid: 0, invalid: invalid.length, duplicates_in_file: duplicatesInFile, already_in_db: 0, new: 0 },
      invalid: invalid.slice(0, 50), sample: [],
    })
  }

  let existing: Set<string>
  try {
    existing = await loadExistingKeys()
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'DB error' }, { status: 500 })
  }

  const fresh = prepared.filter((r) => !existing.has(r.key))
  const alreadyInDb = prepared.length - fresh.length

  if (mode === 'preview') {
    return NextResponse.json({
      mode, columns,
      summary: {
        total, valid: prepared.length, invalid: invalid.length,
        duplicates_in_file: duplicatesInFile, already_in_db: alreadyInDb, new: fresh.length,
      },
      invalid: invalid.slice(0, 50),
      sample: fresh.slice(0, 10).map((r) => ({ name: r.name, city: r.city, cuisine: r.cuisine, website: r.website })),
    })
  }

  // ── commit: batched insert of fresh rows ──
  const tags = tag ? [tag] : null
  let inserted = 0
  const errors: string[] = []
  const toRow = (r: PreparedRow) => ({
    name: r.name, website: r.website, domain: r.domain, city: r.city,
    cuisine: r.cuisine, email: r.email, phone: r.phone, country: r.country,
    business_type: 'restaurant', prospect_status: 'not_audited', tags,
  })

  for (let i = 0; i < fresh.length; i += INSERT_CHUNK) {
    const chunk = fresh.slice(i, i + INSERT_CHUNK).map(toRow)
    const { data, error } = await supabaseAdmin.from('restaurants').insert(chunk).select('id')
    if (error) { errors.push(`Rows ${i + 1}-${i + chunk.length}: ${error.message}`); continue }
    inserted += data?.length ?? 0
  }

  return NextResponse.json({
    mode,
    summary: {
      total, valid: prepared.length, inserted,
      skipped_existing: alreadyInDb, duplicates_in_file: duplicatesInFile,
      invalid: invalid.length, errors: errors.length,
    },
    errors: errors.slice(0, 10),
  })
}
