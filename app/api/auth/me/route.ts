import { NextRequest, NextResponse } from 'next/server'
import { autenticar } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  try {
    const usuario = await prisma.usuario.findUnique({
      where:  { id: auth.usuario.id },
      select: { id: true, nome: true, apelido: true, foto: true, isAdmin: true, permissoes: true, ativo: true },
    })

    if (!usuario || !usuario.ativo) {
      return NextResponse.json({ erro: 'Usuário inativo' }, { status: 401 })
    }

    return NextResponse.json({ usuario })
  } catch (err) {
    console.error('[GET /api/auth/me]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}