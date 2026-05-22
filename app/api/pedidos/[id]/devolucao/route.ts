import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar } from '@/lib/middleware'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
}

export async function POST(
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
    const pedido = await prisma.pedido.findUnique({ where: { id: idNum } })

    if (!pedido) {
      return NextResponse.json({ erro: 'Pedido não encontrado' }, { status: 404 })
    }

    if (pedido.etapa === 'CANCELADO') {
      return NextResponse.json(
        { erro: 'Este pedido já foi cancelado e não pode ser devolvido novamente.' },
        { status: 400 }
      )
    }

    // Campo "pedido" (Json) armazena os itens: [{id, qty, name, price, ...}]
    const itens = pedido.pedido as Array<{
      id:          number
      qty?:        number
      qtd?:        number
      quantidade?: number
    }>

    if (!Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json(
        { erro: 'Pedido não possui itens para devolver.' },
        { status: 400 }
      )
    }

    // Restaura o estoque de cada item em paralelo
    await Promise.all(
      itens.map(item => {
        const qty = item.qty ?? item.qtd ?? item.quantidade ?? 1
        return prisma.estoque.update({
          where: { id: item.id },
          data:  { qtd: { increment: qty } },
        })
      })
    )

    // Marca o pedido como CANCELADO (etapa final)
    const pedidoAtualizado = await prisma.pedido.update({
      where: { id: idNum },
      data:  { etapa: 'CANCELADO' },
    })

    return NextResponse.json(
      { sucesso: true, pedido: pedidoAtualizado },
      { headers: CORS }
    )
  } catch (err) {
    console.error('[POST /api/pedidos/:id/devolucao]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}