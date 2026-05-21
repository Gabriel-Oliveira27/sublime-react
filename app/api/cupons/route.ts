import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar } from '@/lib/middleware'
import { z } from 'zod'

const createSchema = z.object({
  cupom:          z.string().min(1).max(50).toUpperCase(),
  desconto:       z.string().min(1),
  quantidadeUsos: z.number().int().min(1),
})

export async function GET(req: NextRequest) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  try {
    const cupons = await prisma.cupom.findMany({
      orderBy: { id: 'desc' },
    })
    return NextResponse.json(cupons)
  } catch (err) {
    console.error('[GET /api/cupons]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  try {
    const body   = await req.json()
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { erro: 'Dados inválidos', detalhes: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const existente = await prisma.cupom.findUnique({
      where: { cupom: parsed.data.cupom },
    })

    if (existente) {
      return NextResponse.json(
        { erro: 'Já existe um cupom com esse código' },
        { status: 409 }
      )
    }

    const cupom = await prisma.cupom.create({ data: parsed.data })
    return NextResponse.json(cupom, { status: 201 })
  } catch (err) {
    console.error('[POST /api/cupons]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
  })
}
