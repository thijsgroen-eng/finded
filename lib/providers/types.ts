import { ModelName } from '@/types/database'

export interface ModelResponse {
  model: ModelName
  response: string
  timestamp: string
  duration_ms: number
  tokens_used?: number
  error?: string
}

export interface ModelProvider {
  name: ModelName
  runPrompt(prompt: string): Promise<ModelResponse>
}
