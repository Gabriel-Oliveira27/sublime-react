import { NextRequest, NextResponse, after } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exigirPermissao } from '@/lib/middleware'
import { notificarPedidoWeb } from '@/lib/webpush'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await exigirPermissao(req, 'pedidos', 'editar')
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const idNum = parseInt(id)
  if (isNaN(idNum)) {
    return NextResponse.json({ erro: 'ID inválido' }, { status: 400 })
  }

  try {
    const antes  = await prisma.pedido.findUnique({
      where: { id: idNum }, select: { pagamento: true },
    })
    const pedido = await prisma.pedido.update({
      where: { id: idNum },
      data:  { pagamento: 'REALIZADO' },
    })

    // Confirmação manual (dinheiro/PIX no ato) → notifica o cliente (PWA),
    // apenas na transição PENDENTE → REALIZADO.
    if (antes?.pagamento !== 'REALIZADO') {
      const retirada = pedido.endereco.startsWith('Retirada')
      after(() => notificarPedidoWeb(pedido.idRastreio, {
        title: 'Seu pagamento foi confirmado!',
        body: retirada
          ? 'Agora é só ir retirar no endereço do vendedor.'
          : 'Agora é só esperar o seu produto chegar.',
      }))
    }

    return NextResponse.json(pedido)
  } catch (err) {
    console.error('[PATCH /api/pedidos/:id/pagamento]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
  })
}
