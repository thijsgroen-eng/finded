import OpenAI from 'openai'
import { ModelProvider, ModelResponse, RunOptions } from './types'

const SYSTEM_PROMPT =
  'You are a helpful local guide. When asked about restaurants, provide specific, real recommendations with names. List restaurants clearly, typically as numbered lists or clearly named suggestions.'

export class OpenAIProvider implements ModelProvider {
  name = 'openai' as const
  supportsGrounding = true
  private client: OpenAI

  constructor() {
    if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY')
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }

  async runPrompt(prompt: string, options: RunOptions = {}): Promise<ModelResponse> {
    const start = Date.now()
    const timestamp = new Date().toISOString()
    const grounded = options.grounded ?? false

    try {
      // Grounding in the Chat Completions API requires a *-search-preview model
      // with web_search_options. Those models do NOT accept `temperature`, so we
      // only send temperature on the ungrounded path.
      // (Verified against the installed openai SDK + platform.openai.com web-search docs.)
      const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
        model: grounded ? 'gpt-4o-mini-search-preview' : 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 600,
      }
      if (grounded) {
        params.web_search_options = {}
      } else {
        params.temperature = options.temperature ?? 0.7
      }

      const completion = await this.client.chat.completions.create(params)

      const response = completion.choices[0]?.message?.content ?? ''
      const tokens_used = completion.usage?.total_tokens

      return {
        model: this.name,
        response,
        timestamp,
        duration_ms: Date.now() - start,
        tokens_used,
        grounded,
      }
    } catch (error) {
      return {
        model: this.name,
        response: '',
        timestamp,
        duration_ms: Date.now() - start,
        grounded,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}
