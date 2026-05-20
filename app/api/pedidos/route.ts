import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  try {
    const pedidos = await prisma.pedido.findMany({
      orderBy: { dataCompra: 'desc' },
    })
    return NextResponse.json(pedidos)
  } catch (err) {
    console.error('[GET /api/pedidos]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
