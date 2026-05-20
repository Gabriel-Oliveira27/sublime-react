import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt, JwtPayload } from './jwt'

export async function autenticar(
  req: NextRequest
): Promise<{ usuario: JwtPayload } | NextResponse> {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''

  if (!token) {
    return NextResponse.json({ erro: 'Token não fornecido' }, { status: 401 })
  }

  const payload = await verifyJwt(token)
  if (!payload) {
    return NextResponse.json({ erro: 'Token inválido ou expirado' }, { status: 401 })
  }

  return { usuario: payload }
}
