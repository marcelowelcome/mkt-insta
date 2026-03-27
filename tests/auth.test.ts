import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock process.env
beforeEach(() => {
  vi.stubEnv('CRON_SECRET', 'test-secret-123')
  vi.stubEnv('NODE_ENV', 'production')
})

describe('validateCronSecret', () => {
  it('returns null for valid secret', async () => {
    const { validateCronSecret } = await import('@/lib/auth')
    const request = new Request('http://localhost/api/test', {
      headers: { Authorization: 'Bearer test-secret-123' },
    })
    expect(validateCronSecret(request)).toBeNull()
  })

  it('returns 401 for invalid secret', async () => {
    const { validateCronSecret } = await import('@/lib/auth')
    const request = new Request('http://localhost/api/test', {
      headers: { Authorization: 'Bearer wrong-secret' },
    })
    const result = validateCronSecret(request)
    expect(result).not.toBeNull()
    expect(result?.status).toBe(401)
  })

  it('returns 401 for missing header', async () => {
    const { validateCronSecret } = await import('@/lib/auth')
    const request = new Request('http://localhost/api/test')
    const result = validateCronSecret(request)
    expect(result).not.toBeNull()
  })
})

describe('escapeHtml', () => {
  it('escapes HTML characters', async () => {
    const { escapeHtml } = await import('@/lib/auth')
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    )
  })

  it('handles ampersands', async () => {
    const { escapeHtml } = await import('@/lib/auth')
    expect(escapeHtml('A & B')).toBe('A &amp; B')
  })

  it('handles clean strings', async () => {
    const { escapeHtml } = await import('@/lib/auth')
    expect(escapeHtml('Hello World')).toBe('Hello World')
  })
})
