import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// POST /api/push/web/carrinho { endpoint, qtd }
// "Ping" do carrinho: a loja avisa quantos itens o visitante tem e quando foi
// a última atividade. O lembrete de carrinho abandonado usa esses campos
// (ver ../lembrete-carrinho). qtd 0 = carrinho esvaziado/comprado (cancela o
// lembrete pendente). Só atualiza assinaturas já registradas — updateMany em
// endpoint desconhecido é no-op.
const schema = z.object({
  endpoint: z.string().url().max(1024),
  qtd:      z.number().int().min(0).max(999),
})

export async function POST(req: NextRequest) {
  let raw: unknown
  try { raw = await req.json() } catch { raw = null }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })
  }
  const { endpoint, qtd } = parsed.data

  try {
    await prisma.webPushSub.updateMany({
      where: { endpoint },
      data: {
        carrinhoQtd: qtd,
        carrinhoEm:  new Date(),
        // Nova atividade reabilita um próximo lembrete
        carrinhoAviso: null,
      },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/push/web/carrinho]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
