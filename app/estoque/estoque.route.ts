import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  try {
    const estoque = await prisma.estoque.findMany({
      orderBy: { produto: 'asc' },
    })
    return NextResponse.json(estoque)
  } catch (err) {
    console.error('[GET /api/estoque]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
