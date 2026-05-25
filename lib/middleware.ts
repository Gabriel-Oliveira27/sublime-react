import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt, JwtPayload } from './jwt'

export async function autenticar(
  req: NextRequest
): Promise<{ usuario: JwtPayload } | NextResponse> {
  // 1. Cookie httpOnly (método seguro principal)
  let token = req.cookies.get('sublime_auth')?.value ?? ''

  // 2. Fallback: Authorization header (compatibilidade durante migração)
  if (!token) {
    const auth = req.headers.get('Authorization') ?? ''
    token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  }

  if (!token) {
    return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  }

  const payload = await verifyJwt(token)
  if (!payload) {
    return NextResponse.json({ erro: 'Sessão expirada' }, { status: 401 })
  }

  return { usuario: payload }
}

/** Configurações do cookie de autenticação */
export const COOKIE_OPTIONS =
  'HttpOnly; Secure; SameSite=None; Path=/; Max-Age=604800' // 7 dias