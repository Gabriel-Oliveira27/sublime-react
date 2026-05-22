import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  try {
    const pedidos = await prisma.pedido.findMany({
      orderBy: { dataCompra: 'desc' },
    })
    return NextResponse.json(pedidos)
  } catch (err) {
    console.error('[GET /api/pedidos]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customer, items, delivery, payment, coupon, total } = body

    if (!customer?.name || !items?.length || !delivery?.type || !payment?.method) {
      return NextResponse.json({ erro: 'Dados obrigatórios ausentes' }, { status: 400 })
    }

    const ultimo     = await prisma.pedido.findFirst({ orderBy: { id: 'desc' } })
    const seq        = (ultimo?.id ?? 0) + 1
    const idRastreio = `VD-${String(seq).padStart(3, '0')}`

    for (const item of items) {
      await prisma.estoque.update({
        where: { id: item.id },
        data:  { qtd: { decrement: item.qty ?? 1 } },
      })
    }

    const pedido = await prisma.pedido.create({
      data: {
        idRastreio,
        nome:            customer.name,
        contato:         customer.cpf?.replace(/\D/g, '') ?? customer.phone ?? '',
        pedido:          items,
        endereco:        delivery.address ?? delivery.type,
        totalVenda:      total,
        metodoPagamento: payment.method.toUpperCase() as any,
        cupom:           coupon || null,
        frete:           delivery.frete ?? 0,
        parcelas:        payment.installments ?? 1,
        trocoPara:       payment.changeFor ? parseFloat(payment.changeFor) : null,
      },
    })

    return NextResponse.json({ success: true, orderId: pedido.idRastreio }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/pedidos]', err)
    return NextResponse.json({ erro: 'Erro ao registrar pedido' }, { status: 500 })
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