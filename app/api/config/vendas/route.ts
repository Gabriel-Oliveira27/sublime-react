import { CORS_HEADERS, corsOptions } from '@/lib/cors'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar } from '@/lib/middleware'
import { z } from 'zod'

const schema = z.object({
  pix:      z.string().optional(),
  whatsapp: z.string().optional(),
})

const KEYS = { pix: 'PIX_KEY', whatsapp: 'WHATSAPP' }

export async function GET(req: NextRequest) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  try {
    const configs = await prisma.config.findMany({
      where: { chave: { in: Object.values(KEYS) } },
    })
    const map = Object.fromEntries(configs.map(c => [c.chave, c.valor]))
    return NextResponse.json({
      pix:      map[KEYS.pix]      ?? '',
      whatsapp: map[KEYS.whatsapp] ?? '',
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
    const body   = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })
    }

    const updates = []
    if (parsed.data.pix !== undefined) {
      updates.push(prisma.config.upsert({
        where:  { chave: KEYS.pix },
        update: { valor: parsed.data.pix },
        create: { chave: KEYS.pix, valor: parsed.data.pix },
      }))
    }
    if (parsed.data.whatsapp !== undefined) {
      updates.push(prisma.config.upsert({
        where:  { chave: KEYS.whatsapp },
        update: { valor: parsed.data.whatsapp },
        create: { chave: KEYS.whatsapp, valor: parsed.data.whatsapp },
      }))
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