import { NextRequest, NextResponse } from 'next/server'
import { autenticar } from '@/lib/middleware'
import { CORS_HEADERS, corsOptions } from '@/lib/cors'
import { registerPushToken, removePushToken, isExpoPushToken } from '@/lib/push'

// POST /api/push/register  { token }  → registra o dispositivo (vendedor logado)
export async function POST(req: NextRequest) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = null
  }
  const token = (body as { token?: unknown } | null)?.token

  if (!isExpoPushToken(token)) {
    return NextResponse.json(
      { erro: 'Token de push inválido' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  try {
    await registerPushToken(token)
    return NextResponse.json({ success: true }, { headers: CORS_HEADERS })
  } catch (err) {
    console.error('[POST /api/push/register]', err)
    return NextResponse.json(
      { erro: 'Erro ao registrar token' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

// DELETE /api/push/register  { token }  → remove o dispositivo (logout)
export async function DELETE(req: NextRequest) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = null
  }
  const token = (body as { token?: unknown } | null)?.token
  if (typeof token === 'string') {
    await removePushToken(token).catch(() => {})
  }
  return NextResponse.json({ success: true }, { headers: CORS_HEADERS })
}

export function OPTIONS() {
  return corsOptions()
}
