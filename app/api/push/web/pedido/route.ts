import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// POST /api/push/web/pedido { endpoint, orderId }
// Vincula um pedido à assinatura web push do navegador do cliente — a partir
// daí ele recebe as notificações de status desse pedido. Público: só funciona
// para uma assinatura já registrada e um pedido existente, e o cliente só
// conhece o próprio idRastreio (devolvido na criação do pedido).
const schema = z.object({
  endpoint: z.string().url().max(1024),
  orderId:  z.string().min(3).max(32),
})

export async function POST(req: NextRequest) {
  let raw: unknown
  try { raw = await req.json() } catch { raw = null }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })
  }
  const { endpoint, orderId } = parsed.data

  try {
    const [sub, pedido] = await Promise.all([
      prisma.webPushSub.findUnique({ where: { endpoint } }),
      prisma.pedido.findUnique({ where: { idRastreio: orderId }, select: { id: true } }),
    ])
    if (!sub || !pedido) {
      return NextResponse.json({ erro: 'Assinatura ou pedido não encontrado' }, { status: 404 })
    }

    if (!sub.pedidos.includes(orderId)) {
      // Mantém só os últimos 20 pedidos por assinatura
      const pedidos = [...sub.pedidos, orderId].slice(-20)
      await prisma.webPushSub.update({ where: { id: sub.id }, data: { pedidos } })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/push/web/pedido]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
