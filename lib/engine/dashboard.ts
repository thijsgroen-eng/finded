/**
 * Pure helpers for the backoffice dashboard: deciding what counts as a restaurant,
 * deduplicating entities, and tidying display values. Kept I/O-free so the
 * filtering/dedup rules are unit-testable (the dashboard had been showing
 * non-restaurants and duplicate rows).
 */

import { normalizeName, normalizeCity, domainFromUrl } from './normalize'

export interface EntityRow {
  id: string
  name: string
  city: string | null
  cuisine: string | null
  business_type: string | null
  website: string | null
  domain: string | null
}

/**
 * The product is restaurant-first. Treat a row as a restaurant when its
 * business_type is 'restaurant' or unset (legacy rows predate the column).
 * Everything else (dentist, lawyer, clinic, …) is a non-restaurant entity that
 * should not appear in restaurant lists.
 */
export function isRestaurant(businessType: string | null | undefined): boolean {
  if (businessType == null || businessType === '') return true
  return businessType.trim().toLowerCase() === 'restaurant'
}

/** Identity key for dedupe: domain first (strongest), else name+city. */
export function entityKey(r: Pick<EntityRow, 'name' | 'city' | 'website' | 'domain'>): string {
  const d = r.domain || domainFromUrl(r.website)
  if (d) return `domain:${d}`
  const city = (normalizeCity(r.city) ?? '').toLowerCase()
  return `name:${normalizeName(r.name)}|${city}`
}

/** Keep only restaurants (drops non-restaurant entities). */
export function onlyRestaurants<T extends Pick<EntityRow, 'business_type'>>(rows: T[]): T[] {
  return rows.filter((r) => isRestaurant(r.business_type))
}

/** First occurrence per identity key (stable). */
export function dedupeByEntity<T extends Pick<EntityRow, 'name' | 'city' | 'website' | 'domain'>>(rows: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const r of rows) {
    const k = entityKey(r)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(r)
  }
  return out
}

/** Groups of rows that share an identity key (i.e. suspected duplicates). */
export function findDuplicateGroups<T extends Pick<EntityRow, 'name' | 'city' | 'website' | 'domain'>>(rows: T[]): T[][] {
  const groups = new Map<string, T[]>()
  for (const r of rows) {
    const k = entityKey(r)
    ;(groups.get(k) ?? groups.set(k, []).get(k)!).push(r)
  }
  return [...groups.values()].filter((g) => g.length > 1)
}

export interface DataQualityWarnings {
  nonRestaurants: number
  duplicateGroups: number
  missingCity: number
  missingCuisine: number
}

/** Count the data-quality issues the operator should clean up. */
export function dataQualityWarnings(rows: EntityRow[]): DataQualityWarnings {
  const restaurants = onlyRestaurants(rows)
  return {
    nonRestaurants: rows.length - restaurants.length,
    duplicateGroups: findDuplicateGroups(rows).length,
    missingCity: restaurants.filter((r) => !normalizeCity(r.city)).length,
    missingCuisine: restaurants.filter((r) => !r.cuisine || !r.cuisine.trim()).length,
  }
}

/** Display city, normalized (title-case + NL aliases), or a dash. */
export function displayCity(city: string | null | undefined): string {
  return normalizeCity(city) ?? '—'
}
