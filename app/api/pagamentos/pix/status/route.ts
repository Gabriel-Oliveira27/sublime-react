// GET /api/pagamentos/pix/status?orderId=VD-001
// Público — o checkout consulta em loop leve enquanto mostra o QR, até o
// pagamento ser confirmado (pelo webhook do MP ou pela rota /simular no mock).
// Devolve o MÍNIMO: se está pago ou não. Nenhum dado pessoal.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('orderId')?.toUpperCase().trim()
  if (!orderId) {
    return NextResponse.json({ erro: 'Informe orderId' }, { status: 400 })
  }

  try {
    const pedido = await prisma.pedido.findUnique({
      where:  { idRastreio: orderId },
      select: { pagamento: true },
    })
    if (!pedido) {
      return NextResponse.json({ pago: false, encontrado: false })
    }
    return NextResponse.json({ pago: pedido.pagamento === 'REALIZADO', encontrado: true })
  } catch (err) {
    console.error('[GET /api/pagamentos/pix/status]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
