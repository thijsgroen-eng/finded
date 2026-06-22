import { ModelName } from '@/types/database'

/**
 * Pinned audit sampling temperature. Deliberately 0.7 (not 0): we want to capture
 * the real-world variance a user experiences, then average it out by sampling each
 * prompt multiple times. Shared by every provider so samples are comparable.
 */
export const AUDIT_TEMPERATURE = 0.7

const URL_RE = /https?:\/\/[^\s"'<>)\]]+/g

/** Best-effort: pull http(s) URLs out of free-text (citation fallback). */
export function extractUrlsFromText(text: string): string[] {
  if (!text) return []
  const matches = text.match(URL_RE) ?? []
  return [...new Set(matches.map((u) => u.replace(/[.,;:)\]]+$/, '')))]
}

/** Options for a single audit query. */
export interface RunOptions {
  /** Sampling temperature. Lower = more deterministic. Ignored by providers/models
   *  that don't support it (e.g. OpenAI's *-search-preview models). */
  temperature?: number
  /** Request web-search grounding where the provider supports it. */
  grounded?: boolean
}

export interface ModelResponse {
  model: ModelName
  response: string
  timestamp: string
  duration_ms: number
  tokens_used?: number
  error?: string
  /** Whether this response was produced with web-search grounding actually enabled. */
  grounded?: boolean
  /** Exact model identifier used for this call (e.g. "claude-haiku-4-5-20251001"). */
  model_version?: string
  /** Temperature actually applied, or null when the model doesn't accept one. */
  temperature?: number | null
  /** Parsed citation / grounding source URLs from the response (empty if none). */
  sources?: string[]
}

export interface ModelProvider {
  name: ModelName
  /** True if this provider can answer with live web-search grounding. */
  supportsGrounding: boolean
  runPrompt(prompt: string, options?: RunOptions): Promise<ModelResponse>
}
