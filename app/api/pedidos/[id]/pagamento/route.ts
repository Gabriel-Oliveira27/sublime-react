import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar } from '@/lib/middleware'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const idNum = parseInt(id)
  if (isNaN(idNum)) {
    return NextResponse.json({ erro: 'ID inválido' }, { status: 400 })
  }

  try {
    const pedido = await prisma.pedido.update({
      where: { id: idNum },
      data:  { pagamento: 'REALIZADO' },
    })

    return NextResponse.json(pedido)
  } catch (err) {
    console.error('[PATCH /api/pedidos/:id/pagamento]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
