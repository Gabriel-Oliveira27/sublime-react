// Caminho: app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { autenticar } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { CORS_HEADERS } from '@/lib/cors'

export async function GET(req: NextRequest) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  try {
    const usuario = await prisma.usuario.findUnique({
      where:  { id: auth.usuario.id },
      select: {
        id: true, nome: true, apelido: true,
        foto: true, isAdmin: true, permissoes: true, ativo: true, tema: true,
      },
    })

    if (!usuario || !usuario.ativo) {
      return NextResponse.json({ erro: 'Usuário inativo' }, { status: 401, headers: CORS_HEADERS })
    }

    return NextResponse.json({ usuario }, { headers: CORS_HEADERS })
  } catch (err) {
    console.error('[GET /api/auth/me]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500, headers: CORS_HEADERS })
  }
}