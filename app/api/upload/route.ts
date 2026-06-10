import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { createAudit } from '@/lib/engine/audit-runner'
import * as Papa from 'papaparse'
import * as XLSX from 'xlsx'

interface RestaurantRow {
  name?: string
  website?: string
  city?: string
  cuisine?: string
  email?: string
  phone?: string
}

function normaliseRow(raw: Record<string, string>): RestaurantRow {
  // Normalise headers: lowercase, trim, strip spaces/underscores
  const row: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    row[k.toLowerCase().trim().replace(/[\s_-]+/g, '_')] = String(v ?? '').trim()
  }
  return {
    name:    row.name    || row.restaurant_name || row.restaurant || undefined,
    website: row.website || row.url || row.website_url || undefined,
    city:    row.city    || row.location || undefined,
    cuisine: row.cuisine || row.type || row.food_type || undefined,
    email:   row.email   || row.email_address || undefined,
    phone:   row.phone   || row.phone_number || row.telephone || undefined,
  }
}

function parseCSV(content: string): RestaurantRow[] {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  })
  return result.data.map(normaliseRow)
}

function parseXLSX(buffer: ArrayBuffer): RestaurantRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })
  return rows.map(normaliseRow)
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const runAudits = formData.get('run_audits') === 'true'

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const fileName = file.name.toLowerCase()
  let rows: RestaurantRow[] = []

  if (fileName.endsWith('.csv')) {
    const text = await file.text()
    rows = parseCSV(text)
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const buffer = await file.arrayBuffer()
    rows = parseXLSX(buffer)
  } else {
    return NextResponse.json(
      { error: 'Unsupported file type. Use .csv or .xlsx' },
      { status: 400 }
    )
  }

  // Validate rows
  const valid: RestaurantRow[] = []
  const invalid: Array<{ row: number; reason: string }> = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row.name || !row.city) {
      invalid.push({ row: i + 2, reason: 'Missing name or city' })
    } else {
      valid.push(row)
    }
  }

  if (valid.length === 0) {
    return NextResponse.json(
      { error: 'No valid rows found', invalid },
      { status: 422 }
    )
  }

  // Upsert restaurants (avoid duplicates by name+city)
  const created: string[] = []
  const skipped: string[] = []
  const auditIds: string[] = []
  const errors: string[] = []

  for (const row of valid) {
    try {
      // Check if exists
      const { data: existing } = await supabaseAdmin
        .from('restaurants')
        .select('id')
        .ilike('name', row.name!)
        .ilike('city', row.city!)
        .limit(1)

      let restaurantId: string

      if (existing && existing.length > 0) {
        restaurantId = existing[0].id
        skipped.push(row.name!)
      } else {
        const { data: inserted, error } = await supabaseAdmin
          .from('restaurants')
          .insert({
            name:    row.name,
            website: row.website || null,
            city:    row.city,
            cuisine: row.cuisine || null,
            email:   row.email || null,
            phone:   row.phone || null,
          })
          .select('id')
          .single()

        if (error || !inserted) {
          errors.push(`${row.name}: ${error?.message ?? 'Insert failed'}`)
          continue
        }

        restaurantId = inserted.id
        created.push(row.name!)
      }

      if (runAudits) {
        const auditId = await createAudit(restaurantId)
        auditIds.push(auditId)
      }
    } catch (err) {
      errors.push(`${row.name}: ${err instanceof Error ? err.message : 'Unknown'}`)
    }
  }

  return NextResponse.json({
    summary: {
      total:   rows.length,
      valid:   valid.length,
      created: created.length,
      skipped: skipped.length,
      audits_queued: auditIds.length,
      errors:  errors.length,
    },
    created,
    skipped,
    invalid,
    errors,
    audit_ids: auditIds,
  })
}
