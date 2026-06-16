import Anthropic from '@anthropic-ai/sdk'
import { ModelProvider, ModelResponse, RunOptions } from './types'

const SYSTEM_PROMPT =
  'You are a helpful local guide. When asked about restaurants, provide specific, real recommendations with names. List restaurants clearly, typically as numbered lists or clearly named suggestions.'

export class AnthropicProvider implements ModelProvider {
  name = 'anthropic' as const
  supportsGrounding = true
  private client: Anthropic

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('Missing ANTHROPIC_API_KEY')
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }

  async runPrompt(prompt: string, options: RunOptions = {}): Promise<ModelResponse> {
    const start = Date.now()
    const timestamp = new Date().toISOString()
    const grounded = options.grounded ?? false

    try {
      const params: Anthropic.MessageCreateParamsNonStreaming = {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }
      if (options.temperature !== undefined) params.temperature = options.temperature
      if (grounded) {
        // Native server-side web search tool (verified against the installed
        // @anthropic-ai/sdk + Claude web-search-tool docs).
        params.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }]
      }

      const message = await this.client.messages.create(params)

      // With web search the content is a sequence of blocks (text, tool use,
      // results, more text), so concatenate every text block rather than [0].
      const response = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim()
      const tokens_used = message.usage.input_tokens + message.usage.output_tokens

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
