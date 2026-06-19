import { GoogleGenerativeAI } from '@google/generative-ai'
import { ModelProvider, ModelResponse, RunOptions } from './types'

export class GeminiProvider implements ModelProvider {
  name = 'gemini' as const
  supportsGrounding = true
  private client: GoogleGenerativeAI

  constructor() {
    if (!process.env.GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY')
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }

  async runPrompt(prompt: string, options: RunOptions = {}): Promise<ModelResponse> {
    const start = Date.now()
    const timestamp = new Date().toISOString()
    const grounded = options.grounded ?? false
    const modelVersion = 'gemini-2.5-flash'
    const temperature = options.temperature ?? null

    try {
      const model = this.client.getGenerativeModel({
        model: modelVersion,
        systemInstruction:
          'You are a helpful local guide. When asked about restaurants, provide specific, real recommendations with names. List restaurants clearly, typically as numbered lists or clearly named suggestions.',
        ...(options.temperature !== undefined
          ? { generationConfig: { temperature: options.temperature } }
          : {}),
        // CAVEAT: Gemini 2.x grounding uses the `googleSearch` tool, but the
        // installed @google/generative-ai@0.24.1 (deprecated) only types the
        // 1.5-era `googleSearchRetrieval`. We pass `googleSearch` untyped; this
        // is unverified against a live key and may require migrating to the
        // newer `@google/genai` SDK to take effect.
        ...(grounded ? { tools: [{ googleSearch: {} }] as never } : {}),
      })

      const result = await model.generateContent(prompt)
      const response = result.response.text()
      // Grounded responses expose source URIs in groundingMetadata.groundingChunks.
      const meta = (result.response as { candidates?: Array<{ groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string } }> } }> })
        ?.candidates?.[0]?.groundingMetadata
      const sources = (meta?.groundingChunks ?? [])
        .map((c) => c?.web?.uri)
        .filter((u): u is string => !!u)

      return {
        model: this.name,
        response,
        timestamp,
        duration_ms: Date.now() - start,
        grounded,
        model_version: modelVersion,
        temperature,
        sources,
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
