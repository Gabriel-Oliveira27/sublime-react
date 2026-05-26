import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar } from '@/lib/middleware'
import { CORS_HEADERS, corsOptions } from '@/lib/cors'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const idNum = parseInt(id)
  if (isNaN(idNum)) {
    return NextResponse.json({ erro: 'ID inválido' }, { status: 400, headers: CORS_HEADERS })
  }

  try {
    const pedido = await prisma.pedido.findUnique({ where: { id: idNum } })

    if (!pedido) {
      return NextResponse.json({ erro: 'Pedido não encontrado' }, { status: 404, headers: CORS_HEADERS })
    }

    if (pedido.etapa === 'CANCELADO') {
      return NextResponse.json(
        { erro: 'Este pedido já foi cancelado.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    /**
     * Estrutura real do campo "pedido" (Json) — montada em checkout/page.jsx:
     *   { id: string, descricao: string, cores: string, qty: number }
     *
     * item.id  → string ("5"), precisa de parseInt para o Prisma
     * item.qty → quantidade pedida
     */
    const itens = pedido.pedido as Array<{
      id:  string | number
      qty: number
    }>

    if (!Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json(
        { erro: 'Pedido não possui itens para devolver.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Restaura estoque de cada item em paralelo
    await Promise.all(
      itens.map(item => {
        const estoqueId = parseInt(String(item.id))
        const qty       = parseInt(String(item.qty)) || 1
        return prisma.estoque.update({
          where: { id: estoqueId },
          data:  { qtd: { increment: qty } },
        })
      })
    )

    const pedidoAtualizado = await prisma.pedido.update({
      where: { id: idNum },
      data:  { etapa: 'CANCELADO' },
    })

    return NextResponse.json(
      { sucesso: true, pedido: pedidoAtualizado },
      { headers: CORS_HEADERS }
    )
  } catch (err) {
    console.error('[POST /api/pedidos/:id/devolucao]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500, headers: CORS_HEADERS })
  }
}

export function OPTIONS() {
  return corsOptions()
}