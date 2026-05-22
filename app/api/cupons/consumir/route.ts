// ═══════════════════════════════════════════════════════
//  ROTA: /api/cupons/consumir
//  POST — público → decrementa 1 uso do cupom
//                   chamada após pedido confirmado (não crítica)
//
//  Body JSON:
//    { "code": "PROMO10" }
// ═══════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()
    const normalized = String(code ?? '').toUpperCase().trim()

    if (!normalized) {
      return NextResponse.json({ erro: 'Código obrigatório' }, { status: 400 })
    }

    const cupom = await prisma.cupom.findUnique({ where: { cupom: normalized } })

    if (!cupom || cupom.quantidadeUsos <= 0) {
      return NextResponse.json({ success: false })
    }

    await prisma.cupom.update({
      where: { cupom: normalized },
      data:  { quantidadeUsos: { decrement: 1 } },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/cupons/consumir]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
  })
}