/**
 * Universal Intent Engine
 * Generates AI visibility evaluation prompts for any business type.
 * Works for restaurants, dentists, lawyers, hotels, agencies, SaaS, etc.
 *
 * Prompts are generated per language. Dutch is the default for NL businesses
 * (most real restaurant searches in the Netherlands are in Dutch); English is
 * the fallback and is used for the future "any country" generalization.
 */

import { Language } from '@/lib/i18n'

export interface GeneratedPrompt {
  id: string
  category: string
  intent: string
  prompt: string
  tier: 1 | 2 | 3
  importance: number // 1-100
}

export interface BusinessProfile {
  name: string
  businessType: string      // e.g. "restaurant", "dentist", "lawyer", "hotel"
  subtypes: string[]        // e.g. ["seafood", "fine dining"] or ["implants", "whitening"]
  location: string          // city
  country?: string
  specialties?: string[]    // optional extra signals
  language?: Language       // prompt language; defaults to English
}

type TemplateSet = {
  discovery: string[]
  category: string[]
  occasions: string[]
  problemSolution: string[]
  trust: string[]
  geographic: string[]
}

// ── Intent templates per business type ────────────────────────────────────────

const BUSINESS_TEMPLATES: Record<string, TemplateSet> = {

  restaurant: {
    discovery: [
      'Best restaurants in {location}',
      'Top restaurants in {location}',
      'Where should I eat in {location}',
      'Best places to eat in {location}',
      'Highly rated restaurants {location}',
      'Popular restaurants in {location}',
      'Must visit restaurants {location}',
    ],
    category: [
      'Best {subtype} restaurant {location}',
      'Top {subtype} restaurants in {location}',
      'Best {subtype} food in {location}',
      'Where to eat {subtype} in {location}',
      'Authentic {subtype} restaurant {location}',
    ],
    occasions: [
      'Romantic dinner {location}',
      'Best restaurant for a date in {location}',
      'Business dinner {location}',
      'Birthday dinner {location}',
      'Anniversary dinner {location}',
      'Family restaurant {location}',
      'Group dinner {location}',
      'Special occasion restaurant {location}',
    ],
    problemSolution: [
      'Where should I eat with children in {location}',
      'Good restaurant for tourists {location}',
      'Best restaurant for a business lunch {location}',
      'Where can I find {subtype} food in {location}',
      'Best restaurants open late {location}',
      'Best restaurants with outdoor seating {location}',
    ],
    trust: [
      'Most reviewed restaurants {location}',
      'Highest rated restaurants {location}',
      'Local favorite restaurants {location}',
      'Hidden gem restaurants {location}',
      'Award winning restaurants {location}',
    ],
    geographic: [
      'Best {subtype} restaurant near {location} centre',
      'Best restaurants near me {location}',
      '{subtype} restaurant {location} city centre',
    ],
  },

  dentist: {
    discovery: [
      'Best dentist in {location}',
      'Top dental clinic {location}',
      'Dentist near me {location}',
      'Good dentist {location}',
      'Recommended dentist {location}',
    ],
    category: [
      'Best {subtype} dentist {location}',
      '{subtype} dental clinic {location}',
      'Dentist specializing in {subtype} {location}',
      'Best {subtype} treatment {location}',
    ],
    occasions: [
      'Emergency dentist {location}',
      'Dentist for children {location}',
      'Dentist for anxious patients {location}',
      'Dentist accepting new patients {location}',
      'Weekend dentist {location}',
    ],
    problemSolution: [
      'Where to get {subtype} in {location}',
      'How much does {subtype} cost {location}',
      'Best dentist for tooth pain {location}',
      'Affordable dental care {location}',
      'Dentist that accepts insurance {location}',
    ],
    trust: [
      'Highest rated dentist {location}',
      'Most reviewed dental clinic {location}',
      'Trusted dentist {location}',
      'Award winning dental practice {location}',
    ],
    geographic: [
      'Dentist in {location} centre',
      'Dental clinic near {location}',
      '{subtype} dentist {location} area',
    ],
  },

  lawyer: {
    discovery: [
      'Best lawyer in {location}',
      'Top law firm {location}',
      'Attorney {location}',
      'Legal advice {location}',
      'Recommended solicitor {location}',
    ],
    category: [
      'Best {subtype} lawyer {location}',
      '{subtype} attorney {location}',
      'Law firm specializing in {subtype} {location}',
      '{subtype} legal services {location}',
    ],
    occasions: [
      'Urgent legal help {location}',
      'Free legal consultation {location}',
      'Business lawyer {location}',
      'Personal injury lawyer {location}',
      'Startup lawyer {location}',
    ],
    problemSolution: [
      'Who to call for {subtype} case {location}',
      'How to find a {subtype} lawyer {location}',
      'Best lawyer for small business {location}',
      'Affordable legal help {location}',
      'Lawyer that speaks my language {location}',
    ],
    trust: [
      'Highest rated law firm {location}',
      'Most experienced {subtype} lawyer {location}',
      'Award winning attorney {location}',
      'Trusted solicitor {location}',
    ],
    geographic: [
      'Law firm in {location} centre',
      '{subtype} lawyer near {location}',
      'Attorney {location} area',
    ],
  },

  hotel: {
    discovery: [
      'Best hotels in {location}',
      'Top places to stay in {location}',
      'Where to stay in {location}',
      'Best accommodation {location}',
      'Recommended hotels {location}',
    ],
    category: [
      'Best {subtype} hotel {location}',
      '{subtype} accommodation {location}',
      'Luxury hotel {location}',
      'Boutique hotel {location}',
    ],
    occasions: [
      'Romantic hotel {location}',
      'Family hotel {location}',
      'Business hotel {location}',
      'Hotel for honeymoon {location}',
      'Pet friendly hotel {location}',
    ],
    problemSolution: [
      'Best hotel near {location} airport',
      'Hotel with parking {location}',
      'Cheap hotel {location}',
      'Hotel with pool {location}',
      'Long stay hotel {location}',
    ],
    trust: [
      'Highest rated hotel {location}',
      'Most reviewed hotel {location}',
      'Award winning hotel {location}',
      '5 star hotel {location}',
    ],
    geographic: [
      'Hotel in {location} centre',
      'Hotel near {location} station',
      '{subtype} hotel near {location}',
    ],
  },

  agency: {
    discovery: [
      'Best marketing agency {location}',
      'Top digital agency {location}',
      'Recommended agency {location}',
      'Best creative agency {location}',
    ],
    category: [
      'Best {subtype} agency {location}',
      '{subtype} services {location}',
      'Agency specializing in {subtype} {location}',
    ],
    occasions: [
      'Agency for startup {location}',
      'Agency for ecommerce {location}',
      'Agency for small business {location}',
      'Agency for rebrand {location}',
    ],
    problemSolution: [
      'How to find a {subtype} agency {location}',
      'Best agency for {subtype} campaign {location}',
      'Affordable marketing agency {location}',
      'Agency with proven results {location}',
    ],
    trust: [
      'Award winning agency {location}',
      'Most reviewed agency {location}',
      'Top performing {subtype} agency {location}',
    ],
    geographic: [
      '{subtype} agency in {location}',
      'Digital agency near {location}',
    ],
  },

  // Generic fallback for any other business type
  default: {
    discovery: [
      'Best {businessType} in {location}',
      'Top {businessType} {location}',
      'Recommended {businessType} {location}',
      'Good {businessType} near {location}',
    ],
    category: [
      'Best {subtype} {businessType} {location}',
      '{subtype} services {location}',
      'Top {subtype} provider {location}',
    ],
    occasions: [
      '{businessType} for urgent needs {location}',
      '{businessType} for businesses {location}',
      '{businessType} for individuals {location}',
    ],
    problemSolution: [
      'Where to find {subtype} {location}',
      'Who offers {subtype} in {location}',
      'Best {businessType} for {subtype} {location}',
      'Affordable {businessType} {location}',
    ],
    trust: [
      'Highest rated {businessType} {location}',
      'Most reviewed {businessType} {location}',
      'Trusted {businessType} {location}',
    ],
    geographic: [
      '{businessType} in {location} centre',
      '{subtype} {businessType} near {location}',
    ],
  },
}

// ── Dutch templates (restaurant-first; default for other types) ───────────────

const BUSINESS_TEMPLATES_NL: Record<string, TemplateSet> = {
  restaurant: {
    discovery: [
      'Beste restaurants in {location}',
      'Leukste restaurants in {location}',
      'Waar kun je goed eten in {location}',
      'Beste plekken om te eten in {location}',
      'Populaire restaurants in {location}',
      'Aanraders om uit eten te gaan in {location}',
      'Tips voor uit eten in {location}',
    ],
    category: [
      'Beste {subtype} restaurant {location}',
      'Top {subtype} restaurants in {location}',
      'Waar kun je {subtype} eten in {location}',
      'Authentiek {subtype} restaurant {location}',
    ],
    occasions: [
      'Romantisch restaurant {location}',
      'Restaurant voor een date in {location}',
      'Zakelijk diner {location}',
      'Restaurant voor een verjaardag {location}',
      'Familierestaurant {location}',
      'Restaurant voor een groep {location}',
      'Restaurant voor een speciale gelegenheid {location}',
    ],
    problemSolution: [
      'Waar kun je eten met kinderen in {location}',
      'Goed restaurant voor toeristen in {location}',
      'Restaurant voor een zakenlunch {location}',
      'Waar kun je {subtype} eten in {location}',
      'Restaurants die laat open zijn in {location}',
      'Restaurant met terras {location}',
    ],
    trust: [
      'Best beoordeelde restaurants {location}',
      'Hoogst gewaardeerde restaurants {location}',
      'Lokale favoriete restaurants {location}',
      'Verborgen parels restaurants {location}',
      'Bekroonde restaurants {location}',
    ],
    geographic: [
      'Beste {subtype} restaurant in het centrum van {location}',
      'Beste restaurants in de buurt van {location}',
      '{subtype} restaurant centrum {location}',
    ],
  },

  // Generic Dutch fallback for non-restaurant types (until each is localized).
  default: {
    discovery: [
      'Beste {businessType} in {location}',
      'Top {businessType} {location}',
      'Aanrader {businessType} {location}',
      'Goede {businessType} in de buurt van {location}',
    ],
    category: [
      'Beste {subtype} {businessType} {location}',
      '{subtype} diensten {location}',
      'Top {subtype} aanbieder {location}',
    ],
    occasions: [
      '{businessType} met spoed {location}',
      '{businessType} voor bedrijven {location}',
      '{businessType} voor particulieren {location}',
    ],
    problemSolution: [
      'Waar vind je {subtype} in {location}',
      'Wie biedt {subtype} aan in {location}',
      'Beste {businessType} voor {subtype} {location}',
      'Betaalbare {businessType} {location}',
    ],
    trust: [
      'Best beoordeelde {businessType} {location}',
      'Meest gewaardeerde {businessType} {location}',
      'Betrouwbare {businessType} {location}',
    ],
    geographic: [
      '{businessType} in het centrum van {location}',
      '{subtype} {businessType} in de buurt van {location}',
    ],
  },
}

// Template sets by language. English covers all business types; Dutch is
// restaurant-first and falls back to its generic default, then to English.
const TEMPLATES_BY_LANGUAGE: Record<Language, Record<string, TemplateSet>> = {
  en: BUSINESS_TEMPLATES,
  nl: BUSINESS_TEMPLATES_NL,
}

function selectTemplate(businessType: string, language: Language): TemplateSet {
  const lang = TEMPLATES_BY_LANGUAGE[language] ?? BUSINESS_TEMPLATES
  return (
    lang[businessType] ??
    lang.default ??
    BUSINESS_TEMPLATES[businessType] ??
    BUSINESS_TEMPLATES.default
  )
}

// ── Natural language variations ────────────────────────────────────────────────

function generateVariations(basePrompt: string): string[] {
  // The base prompt itself is variation 1
  // Add conversational rewrites
  const conversational = basePrompt
    .replace(/^Best /, 'What is the best ')
    .replace(/^Top /, 'What are the top ')
    .replace(/^Where /, 'Can you tell me where ')

  const visiting = `I'm visiting ${basePrompt.match(/\b[A-Z][a-z]+\b/)?.[0] ?? 'the area'}, ${basePrompt.toLowerCase()}`

  const asking = `Can you recommend ${basePrompt.toLowerCase().replace(/^(best|top|recommended)\s/, 'a good ')}`

  return [basePrompt, conversational, asking].filter((v, i, arr) =>
    v !== basePrompt || i === 0
  ).slice(0, 3)
}

// ── Fill template variables ────────────────────────────────────────────────────

function fillTemplate(
  template: string,
  profile: BusinessProfile,
  subtype?: string
): string {
  return template
    .replace(/{location}/g, profile.location)
    .replace(/{businessType}/g, profile.businessType)
    .replace(/{subtype}/g, subtype ?? profile.subtypes[0] ?? profile.businessType)
}

// ── Importance scoring ─────────────────────────────────────────────────────────

function scoreImportance(category: string): number {
  // Cuisine/category and occasion queries are the winnable, actionable surface,
  // so they rank highest. Generic "best restaurants" discovery is kept only as a
  // benchmark / competitor-discovery signal, at a lower weight.
  switch (category) {
    case 'category':   return 95   // cuisine-specific — the core, winnable
    case 'occasions':  return 82
    case 'discovery':  return 76   // generic — benchmark only
    case 'geographic': return 74
    case 'problem':    return 72
    case 'trust':      return 70
    default:           return 60
  }
}

function getTier(importance: number): 1 | 2 | 3 {
  if (importance >= 80) return 1
  if (importance >= 65) return 2
  return 3
}

// ── Main export ────────────────────────────────────────────────────────────────

export function generatePrompts(profile: BusinessProfile): GeneratedPrompt[] {
  const template = selectTemplate(profile.businessType.toLowerCase(), profile.language ?? 'en')

  const prompts: GeneratedPrompt[] = []
  let idx = 0

  function add(category: string, intent: string, text: string) {
    const importance = scoreImportance(category)
    prompts.push({
      id: `gen-${++idx}`,
      category,
      intent,
      prompt: text,
      tier: getTier(importance),
      importance,
    })
  }

  // Discovery — generic for business type
  for (const t of template.discovery) {
    add('discovery', 'general', fillTemplate(t, profile))
  }

  // Category/subtype specific — one set per subtype
  for (const subtype of profile.subtypes.slice(0, 3)) {
    for (const t of template.category) {
      add('category', subtype, fillTemplate(t, profile, subtype))
    }
  }

  // Occasions
  for (const t of template.occasions) {
    add('occasions', 'occasion', fillTemplate(t, profile))
  }

  // Problem/solution
  for (const t of template.problemSolution) {
    // Fill first subtype into problem templates
    add('problem', 'solution', fillTemplate(t, profile))
  }

  // Trust
  for (const t of template.trust) {
    add('trust', 'authority', fillTemplate(t, profile))
  }

  // Geographic
  for (const t of template.geographic) {
    add('geographic', 'local', fillTemplate(t, profile))
  }

  return prompts.sort((a, b) => b.importance - a.importance)
}

// Quick audit: a cuisine-forward mix. Generic "best restaurants" discovery is
// capped (kept only as a benchmark + competitor-discovery signal); the winnable
// cuisine / occasion / neighbourhood queries dominate. Quotas are applied in
// priority order, then any leftover slots are filled by importance — never adding
// more generic discovery than its cap.
const QUICK_TARGET = 14
const QUICK_QUOTAS: Array<[string, number]> = [
  ['category', 6],    // cuisine-specific — the winnable core
  ['occasions', 3],
  ['geographic', 2],
  ['problem', 1],
  ['discovery', 2],   // generic — benchmark / competitor mapping only
  ['trust', 1],
]

/**
 * Quick audit subset — cuisine/intent-forward, capped generic discovery.
 */
export function getQuickPrompts(
  businessName: string,
  businessType: string,
  location: string,
  country: string = 'Netherlands',
  subtype?: string,
  subtypes?: string[],
  language: Language = 'en'
): GeneratedPrompt[] {
  const profile: BusinessProfile = {
    name: businessName,
    businessType: businessType.toLowerCase(),
    subtypes: subtypes ?? (subtype ? [subtype] : [businessType]),
    location,
    country,
    language,
  }

  const all = generatePrompts(profile) // sorted by importance desc

  const byCategory: Record<string, GeneratedPrompt[]> = {}
  for (const p of all) {
    if (!byCategory[p.category]) byCategory[p.category] = []
    byCategory[p.category].push(p)
  }

  const selected = new Set<string>()
  const result: GeneratedPrompt[] = []

  // Apply per-category quotas in priority order (cuisine first).
  for (const [cat, quota] of QUICK_QUOTAS) {
    for (const p of (byCategory[cat] ?? []).slice(0, quota)) {
      if (result.length >= QUICK_TARGET) break
      if (!selected.has(p.id)) {
        selected.add(p.id)
        result.push(p)
      }
    }
  }

  // Fill remaining slots by importance, but never beyond the generic-discovery cap.
  for (const p of all) {
    if (result.length >= QUICK_TARGET) break
    if (selected.has(p.id) || p.category === 'discovery') continue
    selected.add(p.id)
    result.push(p)
  }

  return result.sort((a, b) => b.importance - a.importance)
}

/**
 * Full prompt set for deep audits (50+ prompts).
 */
export function getFullPrompts(profile: BusinessProfile): GeneratedPrompt[] {
  return generatePrompts(profile)
}
