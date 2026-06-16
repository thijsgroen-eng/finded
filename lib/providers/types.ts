import { ModelName } from '@/types/database'

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
}

export interface ModelProvider {
  name: ModelName
  /** True if this provider can answer with live web-search grounding. */
  supportsGrounding: boolean
  runPrompt(prompt: string, options?: RunOptions): Promise<ModelResponse>
}
