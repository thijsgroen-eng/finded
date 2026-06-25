import { ModelName } from '@/types/database'
import { ModelProvider } from './types'
import { OpenAIProvider } from './openai'
import { AnthropicProvider } from './anthropic'
import { GeminiProvider } from './gemini'
import { PerplexityProvider } from './perplexity'

// Lazy-initialized providers (only instantiated when keys are present)
const providerCache: Partial<Record<ModelName, ModelProvider>> = {}

export function getProvider(model: ModelName): ModelProvider | null {
  if (providerCache[model]) return providerCache[model]!

  try {
    switch (model) {
      case 'openai':
        providerCache[model] = new OpenAIProvider()
        break
      case 'anthropic':
        providerCache[model] = new AnthropicProvider()
        break
      case 'gemini':
        providerCache[model] = new GeminiProvider()
        break
      case 'perplexity':
        providerCache[model] = new PerplexityProvider()
        break
    }
    return providerCache[model]!
  } catch {
    // Provider not configured (missing API key)
    return null
  }
}

export function getAvailableProviders(): ModelProvider[] {
  const models: ModelName[] = ['openai', 'anthropic', 'gemini', 'perplexity']
  return models.map(getProvider).filter(Boolean) as ModelProvider[]
}

/**
 * Providers that have an API key AND are switched on in Settings. Falls back to
 * all key-configured providers if the operator somehow disabled every one (so an
 * audit is never left with zero providers by misconfiguration).
 */
export async function getEnabledProviders(): Promise<ModelProvider[]> {
  const { getSettings } = await import('@/lib/settings')
  const all = getAvailableProviders()
  const s = await getSettings()
  const enabled = all.filter((p) => (s.providers as Record<string, boolean>)[p.name] !== false)
  return enabled.length > 0 ? enabled : all
}

export { OpenAIProvider, AnthropicProvider, GeminiProvider, PerplexityProvider }
