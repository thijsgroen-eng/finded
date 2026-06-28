import { cookies } from 'next/headers'
import type { Language } from './i18n'

/**
 * Viewer (guest/client) language preference, set by the on-page language toggle
 * and stored in a cookie. Server-only (reads next/headers). Falls back to the
 * provided default (usually the operator's configured default, or the audit's
 * own language) when the visitor hasn't chosen one.
 */
export const LANG_COOKIE = 'finded_lang'

export async function getViewerLang(fallback: Language = 'en'): Promise<Language> {
  const v = (await cookies()).get(LANG_COOKIE)?.value
  return v === 'nl' || v === 'en' ? v : fallback
}
