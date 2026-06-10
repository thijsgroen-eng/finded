import { supabaseAdmin } from '@/lib/supabase/client'
import { Prompt } from '@/types/database'

export interface ResolvedPrompt {
  id: string
  category: string
  prompt: string
}

/**
 * Get prompts for a given city.
 * First checks DB for city-specific prompts.
 * If none found, generates them from template prompts and upserts.
 */
export async function getPromptsForCity(city: string): Promise<ResolvedPrompt[]> {
  // Try to find existing prompts for this city (exact city name)
  const { data: existing } = await supabaseAdmin
    .from('prompts')
    .select('id, category, prompt, city')
    .eq('city', city)

  if (existing && existing.length > 0) {
    return existing.map((p: Prompt) => ({
      id: p.id,
      category: p.category,
      prompt: p.prompt,
    }))
  }

  // No prompts for this city — generate from templates and store
  const { data: templates } = await supabaseAdmin
    .from('prompts')
    .select('category, prompt')
    .eq('city', '{city}')

  if (!templates || templates.length === 0) {
    // Fallback: return hardcoded set
    return generateFallbackPrompts(city)
  }

  // Materialise templates for this city
  const resolved = templates.map((t: { category: string; prompt: string }) => ({
    category: t.category,
    prompt: t.prompt.replace('{city}', city),
    city,
  }))

  const { data: inserted } = await supabaseAdmin
    .from('prompts')
    .insert(resolved)
    .select('id, category, prompt')

  return (inserted ?? []).map((p: { id: string; category: string; prompt: string }) => ({
    id: p.id,
    category: p.category,
    prompt: p.prompt,
  }))
}

/**
 * Generate prompts entirely in-memory if DB has no templates.
 * These are NOT persisted.
 */
function generateFallbackPrompts(city: string): ResolvedPrompt[] {
  return [
    { id: 'fallback-1', category: 'general',         prompt: `Best restaurants in ${city}` },
    { id: 'fallback-2', category: 'date_night',       prompt: `Best romantic restaurant in ${city} for a date night` },
    { id: 'fallback-3', category: 'family',           prompt: `Best family-friendly restaurant in ${city}` },
    { id: 'fallback-4', category: 'business_lunch',   prompt: `Best restaurant for a business lunch in ${city}` },
    { id: 'fallback-5', category: 'fine_dining',      prompt: `Best fine dining restaurant in ${city}` },
    { id: 'fallback-6', category: 'local_discovery',  prompt: `Best local restaurants in ${city} recommended by locals` },
    { id: 'fallback-7', category: 'tourist_discovery',prompt: `Where should tourists eat in ${city}` },
  ]
}

/**
 * Add cuisine-specific prompts for a restaurant.
 * These supplement the generic city prompts.
 */
export function getCuisinePrompts(city: string, cuisine: string): ResolvedPrompt[] {
  const c = cuisine.toLowerCase()
  return [
    {
      id: `cuisine-1-${c}`,
      category: 'cuisine',
      prompt: `Best ${c} restaurant in ${city}`,
    },
    {
      id: `cuisine-2-${c}`,
      category: 'cuisine',
      prompt: `Where to eat authentic ${c} food in ${city}`,
    },
    {
      id: `cuisine-3-${c}`,
      category: 'cuisine',
      prompt: `Top ${c} restaurants ${city} for dinner`,
    },
  ]
}
