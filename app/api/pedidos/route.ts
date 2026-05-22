// ═══════════════════════════════════════════════════════
//  ROTA: /api/pedidos
//  GET  — admin (JWT) → lista todos os pedidos (painel admin)
//  POST — público     → cria novo pedido ao finalizar o checkout
//                       gera idRastreio (VD-001, VD-002…)
//                       decrementa estoque de cada item
//                       faz upsert do Cliente pelo CPF
// ═══════════════════════════════════════════════════════
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

// Mapeia os valores que o front envia para os enums do Prisma
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

    // ── idRastreio: busca o maior número VD-XXX existente e incrementa ──
    const ultimoPedido = await prisma.pedido.findFirst({ orderBy: { id: 'desc' } })
    const seq          = (ultimoPedido?.id ?? 0) + 1
    const idRastreio   = `VD-${String(seq).padStart(3, '0')}`

    // ── Decrementa estoque de cada item ──────────────────────────────────
    for (const item of items) {
      await prisma.estoque.update({
        where: { id: Number(item.id) },
        data:  { qtd: { decrement: Number(item.qty ?? 1) } },
      })
    }

    // ── Calcula valorALevar para pagamento em Dinheiro ───────────────────
    const changeFor   = payment.changeFor ? parseFloat(String(payment.changeFor)) : null
    const valorALevar = (changeFor && changeFor > 0) ? +(changeFor - total).toFixed(2) : null

    // ── contato: prioriza CPF limpo; cai para telefone se CPF ausente ─────
    const cpfLimpo = customer.cpf?.replace(/\D/g, '') || ''
    const contato  = cpfLimpo || customer.phone || ''

    // ── Cria o pedido ─────────────────────────────────────────────────────
    const pedido = await prisma.pedido.create({
      data: {
        idRastreio,
        nome:            customer.name,
        contato,
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

    // ── Upsert do Cliente pelo CPF (não-crítico) ──────────────────────────
    if (cpfLimpo) {
      try {
        await prisma.cliente.upsert({
          where:  { cpf: cpfLimpo },
          create: {
            nome:    customer.name,
            cpf:     cpfLimpo,
            contato: customer.phone || '',
            compras: [idRastreio],
          },
          update: {
            compras: { push: idRastreio },
          },
        })
      } catch (clienteErr) {
        console.warn('[POST /api/pedidos] upsert cliente falhou (não-crítico):', clienteErr)
      }
    }

    return NextResponse.json({ success: true, orderId: pedido.idRastreio }, { status: 201 })
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