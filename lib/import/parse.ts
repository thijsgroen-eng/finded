import * as Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { identityKey, normalizeCity, domainFromUrl } from '@/lib/engine/normalize'

/* ── Bulk restaurant import: parse + normalize + validate + dedupe ───────────
 * Built for large files (tens of thousands of rows). Parsing and analysis are
 * pure/in-memory; the only DB work (existence check, insert) happens in the
 * route, batched. This module never touches the database.                     */

export interface ParsedRow {
  name: string | null
  website: string | null
  city: string | null
  cuisine: string | null
  email: string | null
  phone: string | null
  country: string | null
}

export interface PreparedRow {
  name: string
  website: string | null
  domain: string | null
  city: string
  cuisine: string | null
  email: string | null
  phone: string | null
  country: string
  /** Stable identity for in-file + against-DB dedupe: name(spaceless,lower)|city(lower). */
  key: string
}

const HEADERS = ['name', 'website', 'city', 'cuisine', 'email', 'phone', 'country'] as const

/** Lowercase/trim a header and collapse separators so variants map together. */
function normHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[\s_-]+/g, '_')
}

function pickRow(raw: Record<string, unknown>): ParsedRow {
  const row: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) row[normHeader(k)] = String(v ?? '').trim()
  return {
    name:    row.name    || row.restaurant_name || row.restaurant || row.business || row.business_name || null,
    website: row.website || row.url || row.website_url || row.site || null,
    city:    row.city    || row.location || row.town || row.place || null,
    cuisine: row.cuisine || row.type || row.food_type || row.category || null,
    email:   row.email   || row.email_address || row.e_mail || null,
    phone:   row.phone   || row.phone_number || row.telephone || row.tel || null,
    country: row.country || row.land || null,
  }
}

export function detectColumns(raw: Record<string, unknown> | undefined): string[] {
  if (!raw) return []
  return Object.keys(raw)
}

/** Parse a CSV/XLSX file buffer into raw header→value maps. Throws on bad type. */
export function parseFile(fileName: string, csvText: string | null, xlsxBuffer: ArrayBuffer | null): Record<string, unknown>[] {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.csv') && csvText != null) {
    const result = Papa.parse<Record<string, unknown>>(csvText, {
      header: true, skipEmptyLines: true, transformHeader: (h: string) => h.trim(),
    })
    return result.data
  }
  if ((lower.endsWith('.xlsx') || lower.endsWith('.xls')) && xlsxBuffer != null) {
    const wb = XLSX.read(xlsxBuffer, { type: 'array' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  }
  throw new Error('Unsupported file type. Use .csv or .xlsx')
}

export interface Analysis {
  total: number
  invalid: Array<{ row: number; reason: string }>
  /** Valid, in-file-deduped, ready to check against the DB. */
  prepared: PreparedRow[]
  duplicatesInFile: number
}

/** Validate + normalize + dedupe-within-file. No DB access. */
export function analyze(rawRows: Record<string, unknown>[], defaultCountry: string): Analysis {
  const invalid: Array<{ row: number; reason: string }> = []
  const seen = new Set<string>()
  const prepared: PreparedRow[] = []
  let duplicatesInFile = 0

  for (let i = 0; i < rawRows.length; i++) {
    const p = pickRow(rawRows[i])
    const rowNo = i + 2 // 1-based + header row
    if (!p.name || !p.city) {
      invalid.push({ row: rowNo, reason: !p.name && !p.city ? 'Missing name and city' : !p.name ? 'Missing name' : 'Missing city' })
      continue
    }
    const city = normalizeCity(p.city) ?? p.city
    const key = `${identityKey(p.name)}|${city.toLowerCase()}`
    if (seen.has(key)) { duplicatesInFile++; continue }
    seen.add(key)
    prepared.push({
      name: p.name,
      website: p.website || null,
      domain: domainFromUrl(p.website),
      city,
      cuisine: p.cuisine || null,
      email: p.email || null,
      phone: p.phone || null,
      country: p.country || defaultCountry,
      key,
    })
  }
  return { total: rawRows.length, invalid, prepared, duplicatesInFile }
}
