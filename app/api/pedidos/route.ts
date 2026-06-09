import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar } from '@/lib/middleware'
import { CORS_HEADERS, corsOptions } from '@/lib/cors'
import { checkRateLimit } from '@/app/api/auth/login/ratelimit'
import { validateCPF } from '@/lib/utils'
import { PedidoBodySchema } from '@/lib/schemas'
import { logError } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  try {
    const pedidos = await prisma.pedido.findMany({ orderBy: { dataCompra: 'desc' } })
    return NextResponse.json(pedidos, { headers: CORS_HEADERS })
  } catch (err) {
    console.error('[GET /api/pedidos]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500, headers: CORS_HEADERS })
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
  // Rate limit: 10 pedidos por IP por hora
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl  = checkRateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { erro: `Muitos pedidos. Tente novamente em ${rl.retryAfterSec} segundos.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  try {
    const raw    = await req.json()

    // Valida estrutura completa do payload antes de tocar no banco
    const parsed = PedidoBodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { erro: 'Dados inválidos', detalhes: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const body = parsed.data
    const { customer, items, delivery, payment, coupon, total, enderecoEstruturado } = body

    if (!customer?.name || !items?.length || !delivery?.type || !payment?.method) {
      return NextResponse.json({ erro: 'Dados obrigatórios ausentes' }, { status: 400 })
    }

    // Valida CPF se fornecido — rejeita sequências inválidas e checksum errado.
    // validateCPF vive em lib/utils.js e já estava sendo usada no frontend.
    if (customer.cpf) {
      const cpfLimpoCheck = String(customer.cpf).replace(/\D/g, '')
      if (cpfLimpoCheck && !validateCPF(cpfLimpoCheck)) {
        return NextResponse.json({ erro: 'CPF inválido' }, { status: 400 })
      }
    }

    // Validação rápida de tipos antes de tocar no banco
    for (const item of items) {
      const prodId = Number(item.id)
      const qty    = Number(item.qty ?? 1)
      if (!Number.isInteger(prodId) || prodId <= 0)
        return NextResponse.json({ erro: `ID de produto inválido: ${item.id}` }, { status: 400 })
      if (!Number.isInteger(qty) || qty <= 0 || qty > 999)
        return NextResponse.json({ erro: `Quantidade inválida para o item ${prodId}` }, { status: 400 })
    }

    const cpfLimpo    = customer.cpf?.replace(/\D/g, '') || null
    const changeFor   = payment.changeFor ? parseFloat(String(payment.changeFor)) : null
    const valorALevar = changeFor && changeFor > 0 ? +(changeFor - total).toFixed(2) : null

    // ─────────────────────────────────────────────────────────────────────
    // CORREÇÃO CRÍTICA: tudo dentro de uma única transação.
    //
    // Antes: o loop de decremento ficava FORA do $transaction. Se a criação
    // do pedido falhasse depois (ex: erro de constraint, timeout), o estoque
    // já teria sido decrementado sem nenhum pedido gerado — stock leak.
    //
    // Agora: o findUnique + update de cada item e o create do pedido são
    // atomicamente uma coisa só. Qualquer falha reverte tudo.
    // ─────────────────────────────────────────────────────────────────────
    const pedido = await prisma.$transaction(async (tx) => {

      // 1. Valida e decrementa cada item do estoque
      for (const item of items) {
        const prodId = Number(item.id)
        const qty    = Number(item.qty ?? 1)

        const prod = await tx.estoque.findUnique({ where: { id: prodId } })
        if (!prod)
          throw new Error(`Produto não encontrado (id=${prodId}). Recarregue a página.`)
        if (prod.qtd < qty)
          throw new Error(`Estoque insuficiente para "${prod.produto}". Disponível: ${prod.qtd}.`)

        await tx.estoque.update({
          where: { id: prodId },
          data:  { qtd: { decrement: qty } },
        })
      }

      // 2. Gera idRastreio sem gaps dentro da mesma tx
      const todos = await tx.pedido.findMany({
        where:  { idRastreio: { startsWith: 'VD-' } },
        select: { idRastreio: true },
      })
      const lastNum = todos.reduce((max, p) => {
        const n = parseInt(p.idRastreio.replace('VD-', ''), 10) || 0
        return n > max ? n : max
      }, 0)
      const idRastreio = `VD-${String(lastNum + 1).padStart(3, '0')}`

      // 3. Cria o pedido
      return tx.pedido.create({
        data: {
          idRastreio,
          nome:            customer.name,
          contato:         customer.phone || '',
          pedido:          items,
          endereco:        delivery.address ?? delivery.type,
          totalVenda:      total,
          subtotal:        items.reduce((s: number, i: any) =>
                             s + parseFloat(i.valor ?? '0') * (i.qty ?? 1), 0),
          metodoPagamento: toMetodoPagamento(payment.method),
          cupom:           coupon || null,
          frete:           delivery.frete ?? 0,
          parcelas:        Number(payment.installments ?? 1),
          trocoPara:       changeFor ?? null,
          valorALevar:     valorALevar ?? null,
        },
      })
    }, { timeout: 15_000 })

    // Upsert Cliente — não-crítico, fora da tx principal
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
    logError('POST /api/pedidos', err)
    const isBusinessErr = err.message?.includes('insuficiente') ||
                          err.message?.includes('não encontrado')
    return NextResponse.json(
      { erro: err.message ?? 'Erro ao registrar pedido' },
      { status: isBusinessErr ? 409 : 500 }
    )
  }
}

// OPTIONS usa o corsOptions() do lib/cors que já lê DASHBOARD_ORIGIN —
// consistente com o middleware global e as demais rotas.
export function OPTIONS() { return corsOptions() }