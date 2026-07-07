import { NextRequest, NextResponse, after } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exigirPermissao } from '@/lib/middleware'
import { notificarPedidoWeb } from '@/lib/webpush'
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

/** Mensagem enviada ao CLIENTE (PWA da loja) quando a etapa muda. */
function mensagemEtapa(etapa: string, retirada: boolean): { title: string; body: string } | null {
  switch (etapa) {
    case 'CONFIRMADO':
      return { title: 'Pedido confirmado!', body: 'O vendedor confirmou o seu pedido.' }
    case 'EM_PREPARO':
      return { title: 'Pedido em separação', body: 'Seu pedido está sendo preparado com carinho.' }
    case 'SAIU_PARA_ENTREGA':
      return retirada
        ? { title: 'Pedido pronto!', body: 'Seu pedido está pronto para retirada.' }
        : { title: 'Saiu para entrega!', body: 'Seu pedido está a caminho.' }
    case 'ENTREGUE':
      return retirada
        ? { title: 'Pedido concluído', body: 'Obrigado pela preferência!' }
        : { title: 'Pedido entregue', body: 'Aproveite! Obrigado pela preferência.' }
    case 'CANCELADO':
      return { title: 'Pedido cancelado', body: 'Fale com o vendedor se tiver alguma dúvida.' }
    default:
      return null
  }
}

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
    const body   = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ erro: 'Etapa inválida' }, { status: 400 })
    }

    const pedido = await prisma.pedido.update({
      where: { id: idNum },
      data:  { etapa: parsed.data.etapa },
    })

    // Notifica o cliente (PWA) sem segurar a resposta do dashboard/app.
    const msg = mensagemEtapa(pedido.etapa, pedido.endereco.startsWith('Retirada'))
    if (msg) after(() => notificarPedidoWeb(pedido.idRastreio, msg))

    return NextResponse.json(pedido)
  } catch (err) {
    console.error('[PATCH /api/pedidos/:id/etapa]', err)
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
