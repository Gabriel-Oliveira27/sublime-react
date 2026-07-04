import { NextRequest, NextResponse, after } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushToAll } from '@/lib/push'
import { autenticar } from '@/lib/middleware'
import { CORS_HEADERS, corsOptions } from '@/lib/cors'
import { checkRateLimit } from '@/app/api/auth/login/ratelimit'
import { validateCPF } from '@/lib/utils'
import { PedidoBodySchema } from '@/lib/schemas'
import { logError } from '@/lib/logger'
import { CONFIG } from '@/lib/config'
import { lerPixConfig, calcularTaxaPix, getPixProvider, pixModoMock } from '@/lib/pix'

export async function GET(req: NextRequest) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  try {
    const pedidos = await prisma.pedido.findMany({
      orderBy: { dataCompra: 'desc' },
      take: 500, // Limite de segurança — evita retornar o banco inteiro.
                 // Se a loja crescer ao ponto de 500 pedidos não caberem no
                 // dashboard, implemente paginação com skip/take + UI de páginas.
    })
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
  // Rate limit: 10 pedidos por IP a cada 15 min (balde separado do login)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl  = checkRateLimit(ip, 'pedidos')
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
    // `total`/`subtotal` enviados pelo cliente são intencionalmente ignorados:
    // o servidor recalcula tudo a partir do banco (ver transação abaixo).
    const { customer, items, delivery, payment, coupon, enderecoEstruturado } = body

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

    const cpfLimpo        = customer.cpf?.replace(/\D/g, '') || null
    const changeFor       = payment.changeFor ? parseFloat(String(payment.changeFor)) : null
    const metodoPagamento = toMetodoPagamento(payment.method)

    // PIX "pagar agora": só vale se o método é PIX, o cliente pediu E o servidor
    // confirma que está LIGADO no banco. A flag do cliente sozinha não adiciona
    // taxa nem muda o fluxo — blindagem contra manipulação. (Só consulta a
    // config quando o cliente de fato pediu o PIX instantâneo.)
    const pixConfig     = (metodoPagamento === 'PIX' && payment.online === true)
      ? await lerPixConfig(prisma)
      : null
    const querPixOnline = !!pixConfig?.ativo

    // ─────────────────────────────────────────────────────────────────────
    // Tudo dentro de uma única transação atômica: validação de estoque,
    // decremento, recálculo de preços A PARTIR DO BANCO (nunca confiando nos
    // valores enviados pelo cliente) e criação do pedido. Qualquer falha
    // reverte tudo — sem stock leak nem preço manipulado.
    // ─────────────────────────────────────────────────────────────────────
    const pedido = await prisma.$transaction(async (tx) => {

      // 1. Valida estoque, decrementa e soma o subtotal usando o preço do
      //    banco. O `item.valor` do cliente é ignorado (anti price-tampering).
      let subtotalServidor = 0
      for (const item of items) {
        const prodId = Number(item.id)
        const qty    = Number(item.qty ?? 1)

        const prod = await tx.estoque.findUnique({ where: { id: prodId } })
        if (!prod)
          throw new Error(`Produto não encontrado (id=${prodId}). Recarregue a página.`)
        if (prod.qtd < qty)
          throw new Error(`Estoque insuficiente para "${prod.produto}". Disponível: ${prod.qtd}.`)

        subtotalServidor += Number(prod.valor) * qty
        await tx.estoque.update({
          where: { id: prodId },
          data:  { qtd: { decrement: qty } },
        })
      }
      subtotalServidor = +subtotalServidor.toFixed(2)

      // 2. Frete: aceito do cliente, porém saneado (≥ 0). O cálculo completo
      //    depende de config/geocode e é conferido manualmente na venda.
      let freteServidor = Math.max(0, Number(delivery.frete ?? 0)) || 0

      // 3. Desconto do cupom — recalculado no servidor a partir do banco.
      let descontoServidor = 0
      const cupomCode = coupon ? String(coupon).toUpperCase().trim() : null
      if (cupomCode) {
        const c = await tx.cupom.findUnique({ where: { cupom: cupomCode } })
        if (c && c.quantidadeUsos > 0) {
          const d = c.desconto.toLowerCase()
          if (d.includes('frete')) {
            freteServidor = 0
          } else {
            const pct = parseFloat(d.replace('%', '').replace(',', '.'))
            if (!isNaN(pct) && pct > 0)
              descontoServidor = +(subtotalServidor * (pct / 100)).toFixed(2)
          }
        }
      }

      // 4. Total = subtotal − desconto + frete, com juros de parcelamento no crédito.
      let totalServidor = +(subtotalServidor - descontoServidor + freteServidor).toFixed(2)
      const parcelas = Number(payment.installments ?? 1)
      if (metodoPagamento === 'CREDITO' && parcelas > 1) {
        const fee = (CONFIG.INSTALLMENT_FEES as Record<number, number>)[parcelas] ?? 0
        totalServidor = +(totalServidor * (1 + fee)).toFixed(2)
      }

      // Taxa de serviço do PIX online — calculada NO SERVIDOR a partir do config
      // do banco (nunca do cliente). Somada ao total antes de gerar a cobrança.
      let taxaServico = 0
      if (querPixOnline) {
        taxaServico   = calcularTaxaPix(totalServidor, pixConfig)
        totalServidor = +(totalServidor + taxaServico).toFixed(2)
      }

      const valorALevar = changeFor && changeFor > totalServidor
        ? +(changeFor - totalServidor).toFixed(2)
        : null

      // 5. Cria o pedido e deriva o idRastreio do id autoincrement (atômico,
      //    sem o scan O(n) nem a corrida da versão anterior).
      const criado = await tx.pedido.create({
        data: {
          idRastreio:      `PENDENTE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          nome:            customer.name,
          contato:         customer.phone || '',
          pedido:          items,
          endereco:        delivery.address ?? delivery.type,
          totalVenda:      totalServidor,
          subtotal:        subtotalServidor,
          metodoPagamento,
          cupom:           cupomCode,
          frete:           freteServidor,
          parcelas,
          trocoPara:       changeFor ?? null,
          valorALevar,
          pixOnline:       querPixOnline,
          taxaServico,
        },
      })

      return tx.pedido.update({
        where: { id: criado.id },
        data:  { idRastreio: `VD-${String(criado.id).padStart(3, '0')}` },
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

    // Notifica os apps dos vendedores (push). Roda DEPOIS da resposta via
    // `after()` — não adiciona latência nem derruba a venda se a Expo falhar.
    after(() =>
      sendPushToAll({
        title: 'Novo Pedido',
        body:  'Verifique o App para mais informações',
        data:  { type: 'novo-pedido', orderId: pedido.idRastreio },
      })
    )

    // PIX "pagar agora": gera a cobrança no PSP e devolve QR + copia-e-cola.
    let pixResposta:
      | { copiaCola: string; qrCodeDataUrl: string; expiraEm: string; taxaServico: number; total: number; mock: boolean }
      | null = null
    if (querPixOnline) {
      try {
        const charge = await getPixProvider().criarCobranca({
          valor:       Number(pedido.totalVenda),
          descricao:   `Pedido ${pedido.idRastreio} — Sublime`,
          orderId:     pedido.idRastreio,
          expiraEmMin: 10, // QR e copia-e-cola expiram em 10 min
        })
        await prisma.pedido.update({ where: { id: pedido.id }, data: { pspPaymentId: charge.id } })
        pixResposta = {
          copiaCola:     charge.copiaCola,
          qrCodeDataUrl: charge.qrCodeDataUrl,
          expiraEm:      charge.expiraEm,
          taxaServico:   Number(pedido.taxaServico),
          total:         Number(pedido.totalVenda),
          mock:          pixModoMock(),
        }
      } catch (e) {
        // Não derruba a venda: o pedido fica pendente e o cliente pode pagar na
        // retirada/entrega. O front trata `pix: null` como fallback.
        logError('POST /api/pedidos (pix online)', e)
      }
    }

    return NextResponse.json({ success: true, orderId: pedido.idRastreio, pix: pixResposta }, { status: 201 })
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