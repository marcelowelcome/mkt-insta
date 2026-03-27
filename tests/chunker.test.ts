import { describe, it, expect } from 'vitest'
import { chunkText } from '@/lib/rag/chunker'

describe('chunkText', () => {
  it('splits long text into multiple chunks', () => {
    // 512 tokens * 4 chars = 2048 chars per chunk
    const text = 'A'.repeat(1000) + '\n\n' + 'B'.repeat(1000) + '\n\n' + 'C'.repeat(1000)
    const chunks = chunkText(text)
    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach((chunk) => {
      expect(chunk.content.length).toBeGreaterThan(0)
      expect(chunk.tokenCount).toBeGreaterThan(0)
      expect(chunk.chunkIndex).toBeGreaterThanOrEqual(0)
    })
  })

  it('returns single chunk for short text', () => {
    const chunks = chunkText('Hello world')
    expect(chunks).toHaveLength(1)
    expect(chunks[0].content).toBe('Hello world')
    expect(chunks[0].chunkIndex).toBe(0)
  })

  it('returns empty array for empty text', () => {
    const chunks = chunkText('')
    expect(chunks).toHaveLength(0)
  })

  it('preserves metadata in all chunks', () => {
    const text = 'A'.repeat(3000) + '\n\n' + 'B'.repeat(3000)
    const meta = { source: 'test', doc_id: '123' }
    const chunks = chunkText(text, meta)
    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach((chunk) => {
      expect(chunk.metadata).toEqual(meta)
    })
  })

  it('assigns sequential chunk indices', () => {
    const text = 'A'.repeat(3000) + '\n\n' + 'B'.repeat(3000)
    const chunks = chunkText(text)
    chunks.forEach((chunk, i) => {
      expect(chunk.chunkIndex).toBe(i)
    })
  })
})
