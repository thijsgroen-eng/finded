import { ModelProvider, ModelResponse } from './types'

export class PerplexityProvider implements ModelProvider {
  name = 'perplexity' as const
  private apiKey: string

  constructor() {
    if (!process.env.PERPLEXITY_API_KEY) throw new Error('Missing PERPLEXITY_API_KEY')
    this.apiKey = process.env.PERPLEXITY_API_KEY
  }

  async runPrompt(prompt: string): Promise<ModelResponse> {
    const start = Date.now()
    const timestamp = new Date().toISOString()

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
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
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        throw new Error(`Perplexity API error ${response.status}: ${err}`)
      }

      const data = await response.json()
      const text = data.choices?.[0]?.message?.content ?? ''
      const tokens_used = data.usage?.total_tokens

      return {
        model: this.name,
        response: text,
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
