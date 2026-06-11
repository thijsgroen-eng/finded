export interface GeneratedPrompt {
  id: string
  category: string
  prompt: string
  intent: string
}

/**
 * Generate 50+ prompts across 7 intent categories for a business.
 * All prompts are city/category/cuisine aware.
 */
export function generatePrompts(
  businessName: string,
  category: string,
  city: string,
  country: string,
  cuisine?: string
): GeneratedPrompt[] {
  const prompts: GeneratedPrompt[] = []
  let idx = 0

  function add(category: string, intent: string, prompt: string) {
    prompts.push({
      id: `gen-${++idx}`,
      category,
      intent,
      prompt,
    })
  }

  const c = city
  const cuisine_label = cuisine ?? category
  const cat = category.toLowerCase()

  // ── 1. GENERAL DISCOVERY ──────────────────────────────────
  add('general', 'discovery', `Best restaurants in ${c}`)
  add('general', 'discovery', `Top restaurants in ${c}`)
  add('general', 'discovery', `Where should I eat in ${c}`)
  add('general', 'discovery', `Restaurant recommendations ${c}`)
  add('general', 'discovery', `Must visit restaurants ${c}`)
  add('general', 'discovery', `Best places to eat in ${c}`)
  add('general', 'discovery', `Highly rated restaurants ${c}`)
  add('general', 'discovery', `Popular restaurants in ${c}`)

  // ── 2. CATEGORY SPECIFIC ─────────────────────────────────
  add('category', 'specific', `Best ${cuisine_label} restaurant ${c}`)
  add('category', 'specific', `Top ${cuisine_label} restaurants in ${c}`)
  add('category', 'specific', `Best ${cuisine_label} food in ${c}`)
  add('category', 'specific', `Where to eat ${cuisine_label} in ${c}`)
  add('category', 'specific', `Authentic ${cuisine_label} restaurant ${c}`)
  add('category', 'specific', `${cuisine_label} restaurant recommendations ${c}`)
  add('category', 'specific', `Best ${cuisine_label} dining ${c}`)

  // ── 3. USER INTENT ────────────────────────────────────────
  add('intent', 'romantic', `Romantic dinner ${c}`)
  add('intent', 'romantic', `Best restaurant for a date in ${c}`)
  add('intent', 'romantic', `Romantic ${cuisine_label} restaurant ${c}`)
  add('intent', 'business', `Business dinner ${c}`)
  add('intent', 'business', `Best restaurant for business lunch in ${c}`)
  add('intent', 'business', `Professional dining ${c}`)
  add('intent', 'family', `Family restaurant ${c}`)
  add('intent', 'family', `Family friendly restaurants in ${c}`)
  add('intent', 'family', `Best restaurant for families ${c}`)
  add('intent', 'casual', `Casual dinner ${c}`)
  add('intent', 'casual', `Nice dinner out ${c}`)
  add('intent', 'lunch', `Best lunch spots ${c}`)
  add('intent', 'lunch', `Where to have lunch in ${c}`)

  // ── 4. OCCASION BASED ────────────────────────────────────
  add('occasion', 'birthday', `Birthday dinner ${c}`)
  add('occasion', 'birthday', `Best restaurant for birthday celebration ${c}`)
  add('occasion', 'anniversary', `Anniversary dinner ${c}`)
  add('occasion', 'anniversary', `Special occasion restaurant ${c}`)
  add('occasion', 'group', `Group dinner ${c}`)
  add('occasion', 'group', `Restaurant for large group ${c}`)
  add('occasion', 'celebration', `Celebration dinner ${c}`)
  add('occasion', 'special', `Special dinner ${c}`)
  add('occasion', 'special', `Best restaurant for a special evening ${c}`)

  // ── 5. LOCAL DISCOVERY ───────────────────────────────────
  add('local', 'hidden_gems', `Hidden gem restaurants ${c}`)
  add('local', 'locals', `Where do locals eat in ${c}`)
  add('local', 'locals', `Local favorite restaurants ${c}`)
  add('local', 'locals', `Best restaurants according to locals ${c}`)
  add('local', 'underrated', `Underrated restaurants ${c}`)
  add('local', 'authentic', `Most authentic restaurant ${c}`)

  // ── 6. TOURIST DISCOVERY ─────────────────────────────────
  add('tourist', 'visiting', `Best restaurants for tourists in ${c}`)
  add('tourist', 'visiting', `Where should tourists eat in ${c}`)
  add('tourist', 'visiting', `Must try restaurants ${c} first time`)
  add('tourist', 'visiting', `Top restaurants to visit in ${c}`)
  add('tourist', 'experience', `Best dining experience ${c}`)
  add('tourist', 'experience', `Memorable restaurant ${c}`)

  // ── 7. LONG TAIL ─────────────────────────────────────────
  add('longtail', 'quality', `Best quality ${cuisine_label} ${c}`)
  add('longtail', 'quality', `High end ${cuisine_label} restaurant ${c}`)
  add('longtail', 'value', `Good value ${cuisine_label} restaurant ${c}`)
  add('longtail', 'atmosphere', `${cuisine_label} restaurant with great atmosphere ${c}`)
  add('longtail', 'atmosphere', `Cozy ${cuisine_label} restaurant ${c}`)
  add('longtail', 'fine_dining', `Fine dining ${c}`)
  add('longtail', 'fine_dining', `Upscale restaurant ${c}`)
  add('longtail', 'fine_dining', `Michelin star restaurant ${c}`)
  add('longtail', 'weekend', `Best restaurant for dinner ${c} weekend`)
  add('longtail', 'evening', `Best dinner restaurant ${c}`)
  add('longtail', 'new', `New restaurants ${c}`)
  add('longtail', 'popular', `Most popular restaurant ${c} 2025`)

  return prompts
}

/**
 * Get a subset of prompts for quick audits (respects Vercel timeout)
 */
export function getQuickPrompts(
  businessName: string,
  category: string,
  city: string,
  country: string,
  cuisine?: string
): GeneratedPrompt[] {
  const all = generatePrompts(businessName, category, city, country, cuisine)
  // Pick 2 from each category for a balanced 14-prompt quick audit
  const byCategory: Record<string, GeneratedPrompt[]> = {}
  for (const p of all) {
    if (!byCategory[p.category]) byCategory[p.category] = []
    byCategory[p.category].push(p)
  }
  return Object.values(byCategory).flatMap(ps => ps.slice(0, 2))
}
