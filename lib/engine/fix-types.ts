/**
 * Canonical fix/recommendation types — the single source of truth shared by the
 * recommendation generator (which must return one of these, never infer from
 * text), the fix-asset generator (lib/inngest/fix-function.ts FIX_CONFIGS), and
 * the UI. Keep in sync with FIX_CONFIGS keys.
 */
export const FIX_TYPES = [
  'schema_jsonld',
  'faq_page',
  'opening_hours',
  'optimized_description',
  'authority_content',
  'menu_structure',
  'reservation_markup',
  'location_page',
] as const

export type FixType = (typeof FIX_TYPES)[number]

/** Short description of each type, used to instruct the model to pick one. */
export const FIX_TYPE_HINTS: Record<FixType, string> = {
  schema_jsonld: 'Restaurant/LocalBusiness JSON-LD structured data',
  faq_page: 'FAQ page/content answering common diner questions',
  opening_hours: 'Structured opening-hours markup',
  optimized_description: 'AI-optimized meta description / homepage copy',
  authority_content: 'Authority/about content (story, awards, press)',
  menu_structure: 'Structured, crawlable menu markup',
  reservation_markup: 'Reservation/booking links + markup',
  location_page: 'Location/neighbourhood landing content',
}

export function asFixType(value: unknown): FixType | null {
  return typeof value === 'string' && (FIX_TYPES as readonly string[]).includes(value)
    ? (value as FixType)
    : null
}
