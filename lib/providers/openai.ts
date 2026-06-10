import OpenAI from 'openai'
import { ModelProvider, ModelResponse } from './types'

export class OpenAIProvider implements ModelProvider {
  name = 'openai' as const
  private client: OpenAI

  constructor() {
    if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY')
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }

  async runPrompt(prompt: string): Promise<ModelResponse> {
    const start = Date.now()
    const timestamp = new Date().toISOString()

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful local guide. When asked about restaurants, provide specific, real recommendations with names. List restaurants clearly, typically as numbered lists or clearly named suggestions.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 600,
        temperature: 0.7,
      })

      const response = completion.choices[0]?.message?.content ?? ''
      const tokens_used = completion.usage?.total_tokens

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
