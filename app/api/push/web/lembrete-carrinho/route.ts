import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enviarWebPush, webPushDisponivel } from '@/lib/webpush'

// GET /api/push/web/lembrete-carrinho
// Varre as assinaturas com carrinho parado há 10+ minutos e envia UM lembrete
// por sessão de carrinho (novo ping do carrinho reabilita o próximo aviso).
//
// Chamado por um agendador externo (Vercel Cron no plano Pro, ou um serviço
// tipo cron-job.org a cada 5–10 min). Se CRON_SECRET estiver definido no
// ambiente, exige o header Authorization: Bearer <CRON_SECRET> — o mesmo
// formato que a Vercel envia automaticamente para rotas de cron.

const INATIVIDADE_MIN = 10

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }
  if (!webPushDisponivel()) {
    return NextResponse.json({ enviados: 0, motivo: 'web push não configurado' })
  }

  const limite = new Date(Date.now() - INATIVIDADE_MIN * 60_000)

  try {
    const subs = await prisma.webPushSub.findMany({
      where: {
        escopo:        'cliente',
        carrinhoQtd:   { gt: 0 },
        carrinhoEm:    { lt: limite },
        carrinhoAviso: null,
      },
      take: 200,
    })

    if (subs.length === 0) return NextResponse.json({ enviados: 0 })

    await enviarWebPush(subs, {
      title: 'Seu carrinho ainda está aqui!',
      body:  'Conclua sua compra com os melhores preços da região.',
      url:   '/',
      tag:   'carrinho-abandonado',
    })

    await prisma.webPushSub.updateMany({
      where: { id: { in: subs.map((s) => s.id) } },
      data:  { carrinhoAviso: new Date() },
    })

    return NextResponse.json({ enviados: subs.length })
  } catch (err) {
    console.error('[GET /api/push/web/lembrete-carrinho]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
