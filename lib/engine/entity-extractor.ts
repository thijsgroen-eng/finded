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
    return { entities: [], total_mentioned: 0, prompt, model }
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
    }
  } catch {
    return { entities: [], total_mentioned: 0, prompt, model }
  }
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
