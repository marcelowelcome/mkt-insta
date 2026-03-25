export interface ParsedPDF {
  text: string
  numPages: number
  metadata: {
    title?: string
    author?: string
  }
}

/**
 * Extrai texto de um arquivo PDF (Buffer).
 * Limpa whitespace excessivo e retorna texto limpo.
 * Usa import dinamico para evitar que pdf-parse carregue test PDF no build.
 */
export async function parsePDF(buffer: Buffer): Promise<ParsedPDF> {
  // Import dinamico — pdf-parse v1 tenta carregar test PDF no top-level import
  const pdf = (await import('pdf-parse')).default
  const data = await pdf(buffer)

  // Limpa whitespace excessivo mantendo paragrafos
  const cleanText = data.text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return {
    text: cleanText,
    numPages: data.numpages,
    metadata: {
      title: data.info?.Title || undefined,
      author: data.info?.Author || undefined,
    },
  }
}
