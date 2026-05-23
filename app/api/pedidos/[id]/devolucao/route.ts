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
        { erro: 'Este pedido já foi cancelado.' },
        { status: 400 }
      )
    }

    /**
     * Estrutura real do campo "pedido" (Json), vinda do CartContext da loja:
     *   {
     *     id:         string   — ID do estoque como string (ex: "5")
     *     descricao:  string   — nome do produto
     *     quantity:   number   — quantidade pedida
     *     valor:      number   — preço unitário
     *     cores:      string | null
     *     imagem:     string | null
     *     qtd:        number   — estoque disponível no momento da compra
     *   }
     */
    const itens = pedido.pedido as Array<{
      id:       string | number
      quantity: number
    }>

    if (!Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json(
        { erro: 'Pedido não possui itens para devolver.' },
        { status: 400 }
      )
    }

    // Restaura o estoque de cada item em paralelo.
    // id vem como string do cart ("5") → parseInt obrigatório para o Prisma.
    await Promise.all(
      itens.map(item => {
        const estoqueId = parseInt(String(item.id))
        const qty       = parseInt(String(item.quantity)) || 1
        return prisma.estoque.update({
          where: { id: estoqueId },
          data:  { qtd: { increment: qty } },
        })
      })
    )

    // Marca o pedido como CANCELADO
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