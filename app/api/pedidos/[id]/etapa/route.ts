import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar } from '@/lib/middleware'
import { z } from 'zod'

const schema = z.object({
  etapa: z.enum([
    'RESERVADO',
    'CONFIRMADO',
    'EM_PREPARO',
    'SAIU_PARA_ENTREGA',
    'ENTREGUE',
    'CANCELADO',
  ]),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  const id = parseInt(params.id)
  if (isNaN(id)) {
    return NextResponse.json({ erro: 'ID inválido' }, { status: 400 })
  }

  try {
    const body   = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ erro: 'Etapa inválida' }, { status: 400 })
    }

    const pedido = await prisma.pedido.update({
      where: { id },
      data:  { etapa: parsed.data.etapa },
    })

    return NextResponse.json(pedido)
  } catch (err) {
    console.error('[PATCH /api/pedidos/:id/etapa]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
