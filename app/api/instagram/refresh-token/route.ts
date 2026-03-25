import { NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/auth'
import { getAccessToken, refreshLongLivedToken } from '@/lib/meta-client'

export async function POST(request: Request) {
  try {
    const authError = validateCronSecret(request)
    if (authError) return authError

    const currentToken = await getAccessToken()
    const { token, expiresAt } = await refreshLongLivedToken(currentToken)

    return NextResponse.json({
      success: true,
      expires_at: expiresAt.toISOString(),
      token_preview: `${token.slice(0, 10)}...`,
    })
  } catch (err) {
    console.error('[DashIG Refresh Token] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
