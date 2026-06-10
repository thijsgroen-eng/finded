import { GoogleGenerativeAI } from '@google/generative-ai'
import { ModelProvider, ModelResponse } from './types'

export class GeminiProvider implements ModelProvider {
  name = 'gemini' as const
  private client: GoogleGenerativeAI

  constructor() {
    if (!process.env.GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY')
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }

  async runPrompt(prompt: string): Promise<ModelResponse> {
    const start = Date.now()
    const timestamp = new Date().toISOString()

    try {
      const model = this.client.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction:
          'You are a helpful local guide. When asked about restaurants, provide specific, real recommendations with names. List restaurants clearly, typically as numbered lists or clearly named suggestions.',
      })

      const result = await model.generateContent(prompt)
      const response = result.response.text()

      return {
        model: this.name,
        response,
        timestamp,
        duration_ms: Date.now() - start,
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
