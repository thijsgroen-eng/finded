/**
 * Universal Intent Engine
 * Generates AI visibility evaluation prompts for any business type.
 * Works for restaurants, dentists, lawyers, hotels, agencies, SaaS, etc.
 */

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
}

// ── Intent templates per business type ────────────────────────────────────────

const BUSINESS_TEMPLATES: Record<string, {
  discovery: string[]
  category: string[]
  occasions: string[]
  problemSolution: string[]
  trust: string[]
  geographic: string[]
}> = {

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

function scoreImportance(category: string, intent: string): number {
  const scores: Record<string, number> = {
    'discovery:general':     95,
    'category:specific':     90,
    'trust:rating':          85,
    'occasions:high_value':  80,
    'problem:solution':      75,
    'geographic:local':      70,
    'local:hidden':          60,
    'longtail:specific':     50,
  }
  if (category === 'discovery') return 95
  if (category === 'category') return 88
  if (category === 'trust') return 82
  if (category === 'occasions') return 78
  if (category === 'problemSolution') return 72
  if (category === 'geographic') return 65
  return 55
}

function getTier(importance: number): 1 | 2 | 3 {
  if (importance >= 80) return 1
  if (importance >= 65) return 2
  return 3
}

// ── Main export ────────────────────────────────────────────────────────────────

export function generatePrompts(profile: BusinessProfile): GeneratedPrompt[] {
  const template = BUSINESS_TEMPLATES[profile.businessType.toLowerCase()]
    ?? BUSINESS_TEMPLATES.default

  const prompts: GeneratedPrompt[] = []
  let idx = 0

  function add(category: string, intent: string, text: string) {
    const importance = scoreImportance(category, intent)
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

/**
 * Quick audit subset — picks the highest-importance prompts
 * balanced across categories, respecting API cost constraints.
 */
export function getQuickPrompts(
  businessName: string,
  businessType: string,
  location: string,
  country: string = 'Netherlands',
  subtype?: string,
  subtypes?: string[]
): GeneratedPrompt[] {
  const profile: BusinessProfile = {
    name: businessName,
    businessType: businessType.toLowerCase(),
    subtypes: subtypes ?? (subtype ? [subtype] : [businessType]),
    location,
    country,
  }

  const all = generatePrompts(profile)

  // Take top 3 Tier 1, top 3 Tier 2, top 2 Tier 3 = 8 prompts minimum
  // Plus ensure each category is represented at least once
  const byCategory: Record<string, GeneratedPrompt[]> = {}
  for (const p of all) {
    if (!byCategory[p.category]) byCategory[p.category] = []
    byCategory[p.category].push(p)
  }

  const selected = new Set<string>()
  const result: GeneratedPrompt[] = []

  // One from each category first
  for (const cat of Object.keys(byCategory)) {
    const best = byCategory[cat][0]
    if (!selected.has(best.id)) {
      selected.add(best.id)
      result.push(best)
    }
  }

  // Fill up to 14 with highest importance
  for (const p of all) {
    if (result.length >= 14) break
    if (!selected.has(p.id)) {
      selected.add(p.id)
      result.push(p)
    }
  }

  return result.sort((a, b) => b.importance - a.importance)
}

/**
 * Full prompt set for deep audits (50+ prompts).
 */
export function getFullPrompts(profile: BusinessProfile): GeneratedPrompt[] {
  return generatePrompts(profile)
}
