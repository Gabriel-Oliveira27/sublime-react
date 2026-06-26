import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exigirPermissao } from '@/lib/middleware'
import { CORS_HEADERS, corsOptions } from '@/lib/cors'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await exigirPermissao(req, 'pedidos', 'editar')
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const idNum = parseInt(id)
  if (isNaN(idNum)) {
    return NextResponse.json({ erro: 'ID inválido' }, { status: 400, headers: CORS_HEADERS })
  }

  try {
    // Tudo atômico: marca CANCELADO de forma condicional e restaura o estoque.
    // O update condicional (updateMany com etapa != CANCELADO) impede que duas
    // chamadas concorrentes restaurem o estoque em dobro.
    const pedidoAtualizado = await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findUnique({ where: { id: idNum } })
      if (!pedido)                      throw new Error('NOT_FOUND')
      if (pedido.etapa === 'CANCELADO') throw new Error('ALREADY_CANCELLED')

      /**
       * Estrutura do campo "pedido" (Json) montada no checkout:
       *   { id: string|number, descricao, cores, qty: number }
       */
      const itens = pedido.pedido as Array<{ id: string | number; qty: number }>
      if (!Array.isArray(itens) || itens.length === 0) throw new Error('NO_ITEMS')

      const marcado = await tx.pedido.updateMany({
        where: { id: idNum, etapa: { not: 'CANCELADO' } },
        data:  { etapa: 'CANCELADO' },
      })
      if (marcado.count === 0) throw new Error('ALREADY_CANCELLED')

      // Restaura o estoque de cada item. updateMany não lança se o produto
      // tiver sido removido — apenas ignora (count 0).
      for (const item of itens) {
        const estoqueId = parseInt(String(item.id))
        const qty       = parseInt(String(item.qty)) || 1
        if (!Number.isInteger(estoqueId)) continue
        await tx.estoque.updateMany({
          where: { id: estoqueId },
          data:  { qtd: { increment: qty } },
        })
      }

      return tx.pedido.findUnique({ where: { id: idNum } })
    })

    return NextResponse.json(
      { sucesso: true, pedido: pedidoAtualizado },
      { headers: CORS_HEADERS }
    )
  } catch (err: any) {
    const conhecidos: Record<string, [number, string]> = {
      NOT_FOUND:         [404, 'Pedido não encontrado'],
      ALREADY_CANCELLED: [400, 'Este pedido já foi cancelado.'],
      NO_ITEMS:          [400, 'Pedido não possui itens para devolver.'],
    }
    const known = conhecidos[err?.message]
    if (known) {
      return NextResponse.json({ erro: known[1] }, { status: known[0], headers: CORS_HEADERS })
    }
    console.error('[POST /api/pedidos/:id/devolucao]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500, headers: CORS_HEADERS })
  }
}

export function OPTIONS() {
  return corsOptions()
}
