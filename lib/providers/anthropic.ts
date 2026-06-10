import Anthropic from '@anthropic-ai/sdk'
import { ModelProvider, ModelResponse } from './types'

export class AnthropicProvider implements ModelProvider {
  name = 'anthropic' as const
  private client: Anthropic

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('Missing ANTHROPIC_API_KEY')
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }

  async runPrompt(prompt: string): Promise<ModelResponse> {
    const start = Date.now()
    const timestamp = new Date().toISOString()

    try {
      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system:
          'You are a helpful local guide. When asked about restaurants, provide specific, real recommendations with names. List restaurants clearly, typically as numbered lists or clearly named suggestions.',
        messages: [{ role: 'user', content: prompt }],
      })

      const response =
        message.content[0]?.type === 'text' ? message.content[0].text : ''
      const tokens_used =
        message.usage.input_tokens + message.usage.output_tokens

      return {
        model: this.name,
        response,
        timestamp,
        duration_ms: Date.now() - start,
        tokens_used,
      }
    } catch (error) {
      return {
        model: this.name,
        response: '',
        timestamp,
        duration_ms: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}
