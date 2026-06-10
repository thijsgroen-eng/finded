import { Sentiment } from '@/types/database'

export interface MentionResult {
  mentioned: boolean
  position: number | null
  sentiment: Sentiment | null
}

// Positive and negative indicator words for sentiment detection
const POSITIVE_SIGNALS = [
  'excellent', 'outstanding', 'amazing', 'fantastic', 'wonderful', 'delicious',
  'highly recommend', 'best', 'top', 'great', 'loved', 'perfect', 'exceptional',
  'superb', 'brilliant', 'stunning', 'remarkable', 'popular', 'favourite', 'favorite',
  'award', 'michelin', 'must-visit', 'must visit', 'gem', 'renowned', 'acclaimed',
]

const NEGATIVE_SIGNALS = [
  'avoid', 'disappointing', 'poor', 'bad', 'terrible', 'awful', 'worst',
  'overpriced', 'mediocre', 'bland', 'slow service', 'not recommend',
  'unfortunately', 'unfortunately', 'closed', 'no longer',
]

/**
 * Extract restaurant mention from a single AI response.
 *
 * Strategy:
 * 1. Normalise both restaurant name and response
 * 2. Check for exact and fuzzy name matches
 * 3. Find position by splitting into numbered/bulleted items
 * 4. Extract sentiment from surrounding context (~200 chars)
 */
export function extractMention(
  restaurantName: string,
  rawResponse: string
): MentionResult {
  if (!rawResponse || !restaurantName) {
    return { mentioned: false, position: null, sentiment: null }
  }

  const normalised = normaliseText(rawResponse)
  const normName = normaliseText(restaurantName)

  // Build name variants to check (full name + key tokens)
  const nameVariants = buildNameVariants(restaurantName)
  const mentioned = nameVariants.some((v) => normalised.includes(normaliseText(v)))

  if (!mentioned) {
    return { mentioned: false, position: null, sentiment: null }
  }

  const position = extractPosition(rawResponse, nameVariants)
  const sentiment = extractSentiment(rawResponse, nameVariants)

  return { mentioned: true, position, sentiment }
}

function normaliseText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[^a-z0-9\s'&-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Build variants of the restaurant name to handle abbreviations,
 * articles, and common truncations.
 */
function buildNameVariants(name: string): string[] {
  const variants: string[] = [name]

  // Without leading "The ", "Le ", "La ", "De "
  const withoutArticle = name.replace(/^(the|le|la|de|het|een)\s+/i, '')
  if (withoutArticle !== name) variants.push(withoutArticle)

  // First two significant words (handles "Restaurant Name & Grill" → "Restaurant Name")
  const words = name.split(/\s+/).filter((w) => w.length > 2)
  if (words.length >= 2) variants.push(words.slice(0, 2).join(' '))

  return [...new Set(variants)]
}

/**
 * Determine the position of the restaurant in the response.
 * Handles numbered lists (1. 2. 3.), bullet points, and bold headers.
 */
function extractPosition(response: string, nameVariants: string[]): number | null {
  const lines = response.split('\n').filter((l) => l.trim())

  // Try to find numbered list items: "1.", "2.", "1)", etc.
  const numberedPattern = /^(\d+)[.)]\s+(.+)/

  let listPosition = 0
  for (const line of lines) {
    const numbered = line.match(numberedPattern)
    if (numbered) {
      listPosition = parseInt(numbered[1], 10)
      const lineNorm = normaliseText(line)
      if (nameVariants.some((v) => lineNorm.includes(normaliseText(v)))) {
        return listPosition
      }
      continue
    }

    // Bullet point — increment position counter
    if (/^[-•*]\s+/.test(line.trim())) {
      listPosition++
      const lineNorm = normaliseText(line)
      if (nameVariants.some((v) => lineNorm.includes(normaliseText(v)))) {
        return listPosition
      }
      continue
    }

    // Bold item (markdown **Name**)
    if (/\*\*[^*]+\*\*/.test(line)) {
      listPosition++
      const lineNorm = normaliseText(line)
      if (nameVariants.some((v) => lineNorm.includes(normaliseText(v)))) {
        return listPosition
      }
    }
  }

  // Fallback: position by order of first mention in full text
  const normResponse = normaliseText(response)
  const positions = nameVariants
    .map((v) => normResponse.indexOf(normaliseText(v)))
    .filter((p) => p >= 0)

  if (positions.length === 0) return null

  // Count how many other restaurant-like patterns appear before this mention
  const firstMentionIndex = Math.min(...positions)
  const textBefore = response.slice(0, firstMentionIndex)

  // Count numbered items before this position as a rough proxy
  const countBefore = (textBefore.match(/\d+[.)]\s+/g) || []).length
  return countBefore + 1
}

/**
 * Extract sentiment from the ~300 characters surrounding the restaurant mention.
 */
function extractSentiment(response: string, nameVariants: string[]): Sentiment {
  const normResponse = normaliseText(response)

  // Find the window around the first mention
  const matchPositions = nameVariants
    .map((v) => normResponse.indexOf(normaliseText(v)))
    .filter((p) => p >= 0)

  if (matchPositions.length === 0) return 'neutral'

  const mentionIdx = Math.min(...matchPositions)
  const windowStart = Math.max(0, mentionIdx - 50)
  const windowEnd = Math.min(normResponse.length, mentionIdx + 250)
  const context = normResponse.slice(windowStart, windowEnd)

  const positiveCount = POSITIVE_SIGNALS.filter((s) => context.includes(s)).length
  const negativeCount = NEGATIVE_SIGNALS.filter((s) => context.includes(s)).length

  if (positiveCount > negativeCount) return 'positive'
  if (negativeCount > positiveCount) return 'negative'
  return 'neutral'
}
