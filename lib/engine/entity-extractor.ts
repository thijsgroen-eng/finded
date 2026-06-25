import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface ExtractedEntity {
  name: string
  type: 'restaurant' | 'business' | 'location' | 'brand'
  position: number        // order mentioned in response (1-based)
  context: string         // surrounding text snippet
  sentiment: 'positive' | 'neutral' | 'negative'
  reasons: string[]       // why it was recommended
  confidence: number      // 0-1
}

export interface ExtractionResult {
  entities: ExtractedEntity[]
  total_mentioned: number
  prompt: string
  model: string
  /** True when the LLM extraction call itself failed (network/parse error), so
   *  callers can fall back to keyword detection rather than treat it as "no
   *  entities found". */
  failed: boolean
}

/**
 * Use Claude to extract all business entities from an AI response.
 * Much more accurate than keyword matching — handles abbreviations,
 * descriptions without exact names, etc.
 */
export async function extractEntities(
  response: string,
  prompt: string,
  model: string
): Promise<ExtractionResult> {
  if (!response || response.startsWith('ERROR:')) {
    return { entities: [], total_mentioned: 0, prompt, model, failed: false }
  }

  const extractionPrompt = `Extract all restaurant and business names mentioned in this AI response to the query: "${prompt}"

Response to analyse:
"""
${response.slice(0, 3000)}
"""

Return a JSON object with this exact structure:
{
  "entities": [
    {
      "name": "exact business name as mentioned",
      "type": "restaurant",
      "position": 1,
      "context": "brief surrounding context (max 100 chars)",
      "sentiment": "positive|neutral|negative",
      "reasons": ["reason 1", "reason 2"],
      "confidence": 0.95
    }
  ]
}

Rules:
- Extract EVERY business/restaurant mentioned, even briefly
- Position = order of first mention (1 = first mentioned)
- Sentiment = how positively the business is described in context
- Reasons = specific reasons given for recommending it (e.g. "great atmosphere", "Michelin star", "authentic cuisine")
- Confidence = how certain you are this is a real business name (not a generic description)
- Only include actual business names, not generic descriptions like "a cozy Italian place"
- Return ONLY the JSON object, no other text`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: extractionPrompt }],
    })

    const text = message.content[0]?.type === 'text' ? message.content[0].text : '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return {
      entities: parsed.entities ?? [],
      total_mentioned: parsed.entities?.length ?? 0,
      prompt,
      model,
      failed: false,
    }
  } catch {
    return { entities: [], total_mentioned: 0, prompt, model, failed: true }
  }
}

// ── Cheap keyword fallback ──────────────────────────────────────────────────
// Used only when the LLM extractor above fails, to still detect whether the
// TARGET business was mentioned (it can't reliably enumerate competitors).

const POSITIVE_WORDS = ['best', 'top', 'great', 'excellent', 'popular', 'recommend', 'favorite', 'favourite', 'must', 'amazing', 'loved', 'renowned', 'acclaimed', 'michelin']
const NEGATIVE_WORDS = ['avoid', 'disappointing', 'poor', 'bad', 'terrible', 'overpriced', 'mediocre', 'closed', 'no longer']

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s'&-]/g, ' ').replace(/\s+/g, ' ').trim()
}

function nameVariants(name: string): string[] {
  const variants = [name]
  const noArticle = name.replace(/^(the|le|la|de|het|een)\s+/i, '')
  if (noArticle !== name) variants.push(noArticle)
  const words = name.split(/\s+/).filter(w => w.length > 2)
  if (words.length >= 2) variants.push(words.slice(0, 2).join(' '))
  return [...new Set(variants.map(normalizeText))].filter(Boolean)
}

/**
 * Keyword-based detection of whether the target business appears in a response.
 * Returns null if not found. Position is the numbered/bulleted list index when
 * detectable, else null; sentiment is a coarse window-based guess.
 */
export function keywordTargetMention(
  targetName: string,
  response: string
): { position: number | null; sentiment: 'positive' | 'neutral' | 'negative' } | null {
  if (!response || !targetName) return null
  const variants = nameVariants(targetName)
  const norm = normalizeText(response)
  if (!variants.some(v => norm.includes(v))) return null

  // Position via numbered / bulleted list lines.
  let position: number | null = null
  let counter = 0
  for (const line of response.split('\n')) {
    const numbered = line.match(/^\s*(\d+)[.)]\s+/)
    const bulleted = /^\s*[-•*]\s+/.test(line)
    if (numbered) counter = parseInt(numbered[1], 10)
    else if (bulleted) counter++
    else continue
    if (variants.some(v => normalizeText(line).includes(v))) { position = counter; break }
  }

  // Coarse sentiment from a window around the first mention.
  const idx = Math.min(...variants.map(v => norm.indexOf(v)).filter(i => i >= 0))
  const window = norm.slice(Math.max(0, idx - 60), idx + 200)
  const pos = POSITIVE_WORDS.filter(w => window.includes(w)).length
  const neg = NEGATIVE_WORDS.filter(w => window.includes(w)).length
  const sentiment = pos > neg ? 'positive' : neg > pos ? 'negative' : 'neutral'

  return { position, sentiment }
}

/**
 * Resolve entity names to canonical business names.
 * Handles variations: "De Kas", "De Kas Restaurant", "Restaurant De Kas" → "De Kas"
 */
export function resolveEntityName(name: string, knownName: string): number {
  const normalize = (s: string) =>
    s.toLowerCase()
     .replace(/\b(restaurant|café|cafe|bar|bistro|brasserie|ristorante)\b/g, '')
     .replace(/[^a-z0-9]/g, ' ')
     .replace(/\s+/g, ' ')
     .trim()

  const normName = normalize(name)
  const normKnown = normalize(knownName)

  if (normName === normKnown) return 1.0

  // Spacing-insensitive identity ("De Kas" ↔ "Dekas"). Guard tiny names.
  const cName = normName.replace(/\s+/g, '')
  const cKnown = normKnown.replace(/\s+/g, '')
  if (cName.length >= 4 && cName === cKnown) return 1.0

  // Check if one contains the other
  if (normName.includes(normKnown) || normKnown.includes(normName)) return 0.9

  // Word overlap
  const nameWords = new Set(normName.split(' ').filter(w => w.length > 2))
  const knownWords = new Set(normKnown.split(' ').filter(w => w.length > 2))
  const overlap = [...nameWords].filter(w => knownWords.has(w)).length
  const maxWords = Math.max(nameWords.size, knownWords.size)

  return maxWords > 0 ? overlap / maxWords : 0
}

/**
 * Check if a target business is mentioned in an entity list.
 */
export function findTargetInEntities(
  targetName: string,
  entities: ExtractedEntity[],
  threshold = 0.7
): ExtractedEntity | null {
  for (const entity of entities) {
    const score = resolveEntityName(entity.name, targetName)
    if (score >= threshold) return entity
  }
  return null
}
