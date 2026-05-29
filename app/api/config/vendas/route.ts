import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar } from '@/lib/middleware'

const ALLOWED_KEYS = new Set([
  'PIX_KEY', 'WHATSAPP',
  'PAGAMENTO_PIX', 'PAGAMENTO_CREDITO', 'PAGAMENTO_DINHEIRO',
  'WHATSAPP_ATIVO',
  'DESCONTO_GLOBAL',
  'DESCONTO_LINHA_FREEZER', 'DESCONTO_LINHA_AQUECER', 'DESCONTO_LINHA_CONSERVAR',
  'DESCONTO_LINHA_PREPARAR', 'DESCONTO_LINHA_SERVIR',  'DESCONTO_LINHA_ARMAZENAR',
  'FRETE_MODELO', 'FRETE_FAIXAS', 'FRETE_CUSTO_KM', 'FRETE_GRATIS_ACIMA_KM',
  'ORIGEM_ENDERECO', 'ORIGEM_LAT', 'ORIGEM_LON', 'ORIGEM_CEP',
])

export async function GET(req: NextRequest) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  try {
    const configs = await prisma.config.findMany()
    const map = Object.fromEntries(configs.map(c => [c.chave, c.valor]))
    // Retorna tudo + aliases legados para pix/whatsapp
    return NextResponse.json({
      pix:      map['PIX_KEY']  ?? '',
      whatsapp: map['WHATSAPP'] ?? '',
      ...map,
    })
  } catch (err) {
    console.error('[GET /api/config/vendas]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()

    // Novo formato: { chave, valor } — upsert único
    if (typeof body.chave === 'string' && body.valor !== undefined) {
      if (!ALLOWED_KEYS.has(body.chave)) {
        return NextResponse.json({ erro: 'Chave não permitida' }, { status: 400 })
      }
      await prisma.config.upsert({
        where:  { chave: body.chave },
        update: { valor: String(body.valor) },
        create: { chave: body.chave, valor: String(body.valor) },
      })
      return NextResponse.json({ sucesso: true })
    }

    // Formato legado: { pix?, whatsapp? }
    const updates: Promise<unknown>[] = []
    if (typeof body.pix === 'string') {
      updates.push(prisma.config.upsert({
        where:  { chave: 'PIX_KEY' },
        update: { valor: body.pix },
        create: { chave: 'PIX_KEY', valor: body.pix },
      }))
    }
    if (typeof body.whatsapp === 'string') {
      updates.push(prisma.config.upsert({
        where:  { chave: 'WHATSAPP' },
        update: { valor: body.whatsapp },
        create: { chave: 'WHATSAPP', valor: body.whatsapp },
      }))
    }

    if (!updates.length) {
      return NextResponse.json({ erro: 'Nenhum dado válido enviado' }, { status: 400 })
    }
    await Promise.all(updates)
    return NextResponse.json({ sucesso: true })
  } catch (err) {
    console.error('[PATCH /api/config/vendas]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  process.env.DASHBOARD_ORIGIN ?? '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}
