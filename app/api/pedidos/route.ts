import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  try {
    const pedidos = await prisma.pedido.findMany({ orderBy: { dataCompra: 'desc' } })
    return NextResponse.json(pedidos)
  } catch (err) {
    console.error('[GET /api/pedidos]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

function toMetodoPagamento(method: string): 'PIX' | 'DINHEIRO' | 'CREDITO' {
  const m = method.toUpperCase()
  if (m === 'PIX')      return 'PIX'
  if (m === 'DINHEIRO') return 'DINHEIRO'
  if (m === 'CREDITO')  return 'CREDITO'
  throw new Error(`Método de pagamento inválido: ${method}`)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customer, items, delivery, payment, coupon, total } = body

    if (!customer?.name || !items?.length || !delivery?.type || !payment?.method) {
      return NextResponse.json({ erro: 'Dados obrigatórios ausentes' }, { status: 400 })
    }

    // ── Valida e decrementa estoque item a item ───────────────────────────
    // Converte id para number — o CartContext serializa como string
    for (const item of items) {
      const prodId = Number(item.id)
      const qty    = Number(item.qty ?? 1)

      const prod = await prisma.estoque.findUnique({ where: { id: prodId } })

      if (!prod) {
        return NextResponse.json(
          { erro: `Produto não encontrado (id=${prodId}). Recarregue a página e tente novamente.` },
          { status: 409 }
        )
      }

      if (prod.qtd < qty) {
        return NextResponse.json(
          { erro: `Estoque insuficiente para "${prod.produto}". Disponível: ${prod.qtd}.` },
          { status: 409 }
        )
      }

      await prisma.estoque.update({
        where: { id: prodId },
        data:  { qtd: { decrement: qty } },
      })
    }

    // ── Cria pedido com placeholder e atualiza com id real (VD-001 = id 1) ─
    const cpfLimpo    = customer.cpf?.replace(/\D/g, '') || null
    const changeFor   = payment.changeFor ? parseFloat(String(payment.changeFor)) : null
    const valorALevar = (changeFor && changeFor > 0) ? +(changeFor - total).toFixed(2) : null

    const pedido = await prisma.pedido.create({
      data: {
        idRastreio:      '__TEMP__',
        nome:            customer.name,
        contato:         customer.phone || '',
        cpf:             cpfLimpo,
        pedido:          items,
        endereco:        delivery.address ?? delivery.type,
        totalVenda:      total,
        metodoPagamento: toMetodoPagamento(payment.method),
        cupom:           coupon || null,
        frete:           delivery.frete ?? 0,
        parcelas:        Number(payment.installments ?? 1),
        trocoPara:       changeFor ?? null,
        valorALevar:     valorALevar ?? null,
      },
    })

    const idRastreio = `VD-${String(pedido.id).padStart(3, '0')}`
    await prisma.pedido.update({ where: { id: pedido.id }, data: { idRastreio } })

    // ── Upsert do Cliente pelo CPF (não-crítico) ──────────────────────────
    if (cpfLimpo) {
      try {
        await prisma.cliente.upsert({
          where:  { cpf: cpfLimpo },
          create: { nome: customer.name, cpf: cpfLimpo, contato: customer.phone || '', compras: [idRastreio] },
          update: { compras: { push: idRastreio } },
        })
      } catch (e) {
        console.warn('[POST /api/pedidos] upsert cliente falhou (não-crítico):', e)
      }
    }

    return NextResponse.json({ success: true, orderId: idRastreio }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/pedidos]', err)
    return NextResponse.json({ erro: err.message ?? 'Erro ao registrar pedido' }, { status: 500 })
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