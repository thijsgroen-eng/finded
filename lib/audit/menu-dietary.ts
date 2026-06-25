/**
 * Menu + dietary discoverability — can AI read what you serve and for whom?
 *
 * Pure, dependency-free analysers over a page's HTML so they're unit-testable and
 * run inside the website scraper. These are SIGNALS (heuristics), surfaced as
 * such — not exact claims.
 */

export type MenuFormat = 'html' | 'pdf' | 'image' | 'none'
export type MenuRichness = 'strong' | 'weak' | 'none'

export interface MenuAnalysis {
  format: MenuFormat
  /** How descriptive the menu text is (entity richness AI can extract). */
  richness: MenuRichness
}

// Ingredient/preparation words that signal a descriptive ("entity-rich") menu —
// "homemade truffle pasta with pecorino" rather than just "pasta".
const RICH_WORDS = [
  'huisgemaakt', 'vers', 'geserveerd', 'gegrild', 'gebakken', 'gestoofd', 'gerookt',
  'truffel', 'biologisch', 'seizoen', 'gemarineerd', 'saus', 'kruiden',
  'homemade', 'fresh', 'served', 'grilled', 'roasted', 'braised', 'smoked',
  'truffle', 'organic', 'seasonal', 'marinated', 'sauce', 'slow-cooked', 'pecorino',
]

function priceHits(html: string): number {
  return (html.match(/€\s?\d|\d+[.,]\d{2}\s*€|\bEUR\b/gi) ?? []).length
}

export function analyzeMenu(html: string): MenuAnalysis {
  const lower = html.toLowerCase()
  const hasMenuRef = lower.includes('/menu') || /\bmenu\b|menukaart|spijskaart/.test(lower)

  const structured = lower.includes('schema.org/menu') || lower.includes('"@type":"menu"') || lower.includes('"@type": "menu"')
  const pricey = priceHits(html) >= 4
  const pdfMenu = /href=["'][^"']*(menu|kaart)[^"']*\.pdf/i.test(html) || (/href=["'][^"']*\.pdf/i.test(html) && hasMenuRef)
  const imageMenu = /<img[^>]+(menu|menukaart|spijskaart)[^>]*>/i.test(html)

  let format: MenuFormat
  if (structured || pricey) format = 'html'
  else if (pdfMenu) format = 'pdf'
  else if (imageMenu) format = 'image'
  else if (hasMenuRef) format = 'html'
  else format = 'none'

  let richness: MenuRichness = 'none'
  if (format !== 'none') {
    const hits = RICH_WORDS.filter((w) => lower.includes(w)).length
    richness = hits >= 6 ? 'strong' : 'weak'
  }
  return { format, richness }
}

const DIETS: { key: string; label: string; match: RegExp }[] = [
  { key: 'vegan', label: 'Vegan', match: /\bvegan\b|veganistisch|plant-based|plantaardig/i },
  { key: 'vegetarian', label: 'Vegetarian', match: /vegetar/i },
  { key: 'gluten_free', label: 'Gluten-free', match: /gluten[\s-]?free|glutenvrij|sans gluten/i },
  { key: 'halal', label: 'Halal', match: /\bhalal\b/i },
  { key: 'allergens', label: 'Allergen info', match: /allergen|allergie|allergenen/i },
]

export interface DietaryAnalysis { detected: string[] }

/** Which dietary signals the page exposes (labels). */
export function analyzeDietary(html: string): DietaryAnalysis {
  return { detected: DIETS.filter((d) => d.match.test(html)).map((d) => d.label) }
}
