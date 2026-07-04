// POST /api/pagamentos/pix/simular   { orderId }
// APENAS PARA TESTE LOCAL (modo mock, sem Mercado Pago). Simula o webhook:
// marca o pedido como pago para você validar o fluxo "aguardando → confirmado".
//
// Bloqueado automaticamente quando há MP_ACCESS_TOKEN (produção/sandbox real)
// ou NODE_ENV=production. Some sozinho assim que você plugar o Mercado Pago.
import { NextRequest, NextResponse } from 'next/server'
import { pixModoMock } from '@/lib/pix'
import { confirmarPagamentoPix } from '@/lib/pixConfirm'

export async function POST(req: NextRequest) {
  if (!pixModoMock() || process.env.NODE_ENV === 'production') {
    return NextResponse.json({ erro: 'Indisponível' }, { status: 404 })
  }

  let body: any = null
  try { body = await req.json() } catch { /* vazio */ }
  const orderId = String(body?.orderId ?? '').toUpperCase().trim()
  if (!orderId) {
    return NextResponse.json({ erro: 'Informe orderId' }, { status: 400 })
  }

  const ok = await confirmarPagamentoPix({ orderId })
  return NextResponse.json({ ok })
}
