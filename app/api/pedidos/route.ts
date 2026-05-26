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
    const { customer, items, delivery, payment, coupon, total, enderecoEstruturado } = body

    if (!customer?.name || !items?.length || !delivery?.type || !payment?.method) {
      return NextResponse.json({ erro: 'Dados obrigatórios ausentes' }, { status: 400 })
    }

    // ── Valida e decrementa estoque ───────────────────────────────────────
    for (const item of items) {
      const prodId = Number(item.id)
      const qty    = Number(item.qty ?? 1)
      const prod   = await prisma.estoque.findUnique({ where: { id: prodId } })

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

    // ── Dados auxiliares ─────────────────────────────────────────────────
    const cpfLimpo    = customer.cpf?.replace(/\D/g, '') || null
    const changeFor   = payment.changeFor ? parseFloat(String(payment.changeFor)) : null
    const valorALevar = changeFor && changeFor > 0 ? +(changeFor - total).toFixed(2) : null

    // ── Cria pedido dentro de transação — idRastreio sem gaps ─────────────
    // Lê o maior VD-XXX existente e incrementa atomicamente.
    // Nenhum __TEMP__ necessário; funciona mesmo com pedidos cancelados/deletados.
    const pedido = await prisma.$transaction(async (tx) => {
      // Busca TODOS os idRastreio VD- e encontra o maior número real.
      // Ordenar por `id` (autoincrement) não é confiável — se um pedido
      // com id maior tiver um VD menor (edição manual, seed, etc.) o próximo
      // número seria errado. Achar o max explicitamente é simples e correto.
      const todos = await tx.pedido.findMany({
        where:  { idRastreio: { startsWith: 'VD-' } },
        select: { idRastreio: true },
      })
      const lastNum = todos.reduce((max, p) => {
        const n = parseInt(p.idRastreio.replace('VD-', ''), 10) || 0
        return n > max ? n : max
      }, 0)
      const idRastreio = `VD-${String(lastNum + 1).padStart(3, '0')}`

      return tx.pedido.create({
        data: {
          idRastreio,
          nome:            customer.name,
          contato:         customer.phone || '',
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
    })

    // ── Upsert Cliente (não-crítico) ──────────────────────────────────────
    if (cpfLimpo) {
      try {
        const enderecoStr = enderecoEstruturado ? JSON.stringify(enderecoEstruturado) : null
        await prisma.cliente.upsert({
          where:  { cpf: cpfLimpo },
          create: {
            nome:      customer.name,
            cpf:       cpfLimpo,
            contato:   customer.phone || '',
            compras:   [pedido.idRastreio],
            enderecos: enderecoStr ? [enderecoStr] : [],
          },
          update: {
            compras:   { push: pedido.idRastreio },
            ...(enderecoStr ? { enderecos: { push: enderecoStr } } : {}),
          },
        })
      } catch (e) {
        console.warn('[POST /api/pedidos] upsert cliente:', e)
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