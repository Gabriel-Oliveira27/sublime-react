// POST /api/webhooks/mercadopago
// Recebe a notificação do Mercado Pago quando um pagamento muda de estado.
//
// SEGURANÇA (importante):
//  1. Valida a ASSINATURA (x-signature) com o MP_WEBHOOK_SECRET — se configurado.
//  2. NÃO confia no corpo: reconsulta o status DIRETO no MP pela API.
//  3. Só marca pago se status === approved E o valor bate com o total do pedido.
//  4. Idempotente (confirmar duas vezes não duplica nada).
//
// Enquanto você não configurar o webhook no painel do MP, esta rota fica pronta
// e inofensiva. Em produção, aponte o webhook do MP para esta URL.
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getPixProvider } from '@/lib/pix'
import { confirmarPagamentoPix } from '@/lib/pixConfirm'

function assinaturaValida(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) return true // sem segredo configurado ainda → não bloqueia (dev)

  const sig = req.headers.get('x-signature') ?? ''
  const requestId = req.headers.get('x-request-id') ?? ''
  // x-signature: "ts=1699...,v1=abc123..."
  const parts = Object.fromEntries(sig.split(',').map((p) => p.split('=').map((s) => s.trim())))
  const ts = parts['ts']
  const v1 = parts['v1']
  if (!ts || !v1) return false

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const esperado = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(v1))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    // O id do pagamento vem em ?data.id= ou no corpo { data: { id } } / { resource }
    const url = new URL(req.url)
    let dataId = url.searchParams.get('data.id') || url.searchParams.get('id') || ''

    let body: any = null
    try { body = await req.json() } catch { /* pode vir vazio */ }
    if (!dataId) dataId = String(body?.data?.id ?? body?.resource ?? '')

    if (!dataId) return NextResponse.json({ ok: true }) // nada a fazer

    if (!assinaturaValida(req, dataId)) {
      return NextResponse.json({ erro: 'assinatura inválida' }, { status: 401 })
    }

    // Reconsulta o status real no PSP — nunca confiar no corpo do webhook.
    const { status, valor } = await getPixProvider().consultarStatus(dataId)
    if (status === 'aprovado') {
      await confirmarPagamentoPix({ pspPaymentId: dataId, valorEsperado: valor })
    }

    // Sempre 200 para o MP não ficar reenviando.
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/webhooks/mercadopago]', err)
    // Ainda assim 200: erros nossos não devem virar retry infinito do MP.
    return NextResponse.json({ ok: true })
  }
}
