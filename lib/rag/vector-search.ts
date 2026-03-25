import { createServerSupabaseClient } from '@/lib/supabase'
import type { SearchResult } from '@/types/instagram'

/**
 * Busca os chunks mais relevantes via pgvector (cosine similarity).
 * Usa a funcao SQL search_knowledge() — nunca calcula distancia no TypeScript.
 */
export async function vectorSearch(
  queryEmbedding: number[],
  options: { threshold?: number; limit?: number } = {}
): Promise<SearchResult[]> {
  const { threshold = 0.70, limit = 8 } = options
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.rpc('search_knowledge', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: threshold,
    match_count: limit,
  })

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`)
  }

  return (data ?? []) as SearchResult[]
}
