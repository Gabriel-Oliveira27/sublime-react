import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body       = await req.json()
    const normalized = String(body.code    ?? '').toUpperCase().trim()
    const orderId    = String(body.orderId ?? '').toUpperCase().trim()

    if (!normalized || normalized.length > 50) {
      return NextResponse.json({ erro: 'Código inválido' }, { status: 400 })
    }

    // Verifica se o pedido existe e realmente usou este cupom.
    // Se orderId não foi enviado (chamada antiga sem atualização do front),
    // aceitamos para não quebrar retrocompatibilidade — mas logamos um aviso.
    if (orderId) {
      const pedido = await prisma.pedido.findUnique({
        where:  { idRastreio: orderId },
        select: { cupom: true },
      })
      if (!pedido) {
        // Pedido não existe — não consome, mas responde success para não
        // revelar informações sobre pedidos de terceiros.
        return NextResponse.json({ success: false })
      }
      if (pedido.cupom?.toUpperCase() !== normalized) {
        // Cupom não bate com o pedido — possível replay de outro código.
        return NextResponse.json({ success: false })
      }
    } else {
      console.warn('[POST /api/cupons/consumir] chamado sem orderId — atualizar front-end.')
    }

    const cupom = await prisma.cupom.findUnique({ where: { cupom: normalized } })
    if (!cupom || cupom.quantidadeUsos <= 0) {
      return NextResponse.json({ success: false })
    }

    await prisma.cupom.update({
      where: { cupom: normalized },
      data:  { quantidadeUsos: { decrement: 1 } },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/cupons/consumir]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
