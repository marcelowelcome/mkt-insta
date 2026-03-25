const MAX_TOKENS = 512
const OVERLAP_TOKENS = 64
// Estimativa conservadora: 1 token ~ 4 chars em portugues
const CHARS_PER_TOKEN = 4

export interface TextChunk {
  content: string
  chunkIndex: number
  tokenCount: number
  metadata?: Record<string, unknown>
}

/**
 * Divide texto em chunks de ~512 tokens com overlap de 64 tokens.
 * Prefere quebrar em paragrafos ou pontos finais para nao cortar frases.
 */
export function chunkText(
  text: string,
  metadata?: Record<string, unknown>
): TextChunk[] {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
  const chunks: TextChunk[] = []
  let currentChunk = ''
  let chunkIndex = 0

  for (const paragraph of paragraphs) {
    const combined = currentChunk
      ? `${currentChunk}\n\n${paragraph}`
      : paragraph
    const estimatedTokens = Math.ceil(combined.length / CHARS_PER_TOKEN)

    if (estimatedTokens > MAX_TOKENS && currentChunk) {
      // Salva chunk atual
      chunks.push(createChunk(currentChunk, chunkIndex, metadata))
      chunkIndex++

      // Overlap: pega o final do chunk anterior
      const overlapChars = OVERLAP_TOKENS * CHARS_PER_TOKEN
      const overlapText = currentChunk.slice(-overlapChars)
      currentChunk = `${overlapText}\n\n${paragraph}`

      // Se mesmo com overlap o paragrafo sozinho e muito grande, subdivide
      if (
        Math.ceil(currentChunk.length / CHARS_PER_TOKEN) > MAX_TOKENS
      ) {
        const subChunks = splitLargeParagraph(currentChunk)
        for (const sub of subChunks.slice(0, -1)) {
          chunks.push(createChunk(sub, chunkIndex, metadata))
          chunkIndex++
        }
        currentChunk = subChunks[subChunks.length - 1]
      }
    } else {
      currentChunk = combined
    }
  }

  // Ultimo chunk
  if (currentChunk.trim()) {
    chunks.push(createChunk(currentChunk, chunkIndex, metadata))
  }

  return chunks
}

function createChunk(
  content: string,
  chunkIndex: number,
  metadata?: Record<string, unknown>
): TextChunk {
  const trimmed = content.trim()
  return {
    content: trimmed,
    chunkIndex,
    tokenCount: Math.ceil(trimmed.length / CHARS_PER_TOKEN),
    metadata,
  }
}

/**
 * Subdivide um paragrafo muito grande em pedacos menores,
 * quebrando preferencialmente em pontos finais.
 */
function splitLargeParagraph(text: string): string[] {
  const maxChars = MAX_TOKENS * CHARS_PER_TOKEN
  const sentences = text.split(/(?<=[.!?])\s+/)
  const parts: string[] = []
  let current = ''

  for (const sentence of sentences) {
    const combined = current ? `${current} ${sentence}` : sentence

    if (combined.length > maxChars && current) {
      parts.push(current.trim())
      // Overlap
      const overlapChars = OVERLAP_TOKENS * CHARS_PER_TOKEN
      const overlap = current.slice(-overlapChars)
      current = `${overlap} ${sentence}`
    } else {
      current = combined
    }
  }

  if (current.trim()) {
    parts.push(current.trim())
  }

  return parts
}
