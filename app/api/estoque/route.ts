import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar } from '@/lib/middleware'
import { z } from 'zod'

const createSchema = z.object({
  produto: z.string().min(1),
  linha:   z.enum(['FREEZER','AQUECER','CONSERVAR','PREPARAR','SERVIR','ARMAZENAR']),
  litros:  z.string().default(''),
  cores:   z.string().default(''),
  qtd:     z.number().int().min(0),
  valor:   z.number().min(0),
  imagem:  z.string().default(''),
  filtros: z.string().default(''),
})

export async function GET() {
  try {
    const estoque = await prisma.estoque.findMany({ orderBy: { produto: 'asc' } })
    return NextResponse.json(estoque)
  } catch (err) {
    console.error('[GET /api/estoque]', err)
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

    const item = await prisma.estoque.create({ data: parsed.data })
    return NextResponse.json(item, { status: 201 })
  } catch (err) {
    console.error('[POST /api/estoque]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}