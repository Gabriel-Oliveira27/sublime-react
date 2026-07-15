import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exigirPermissao } from '@/lib/middleware'
import { z } from 'zod'

const createSchema = z.object({
  produto: z.string().min(1),
  linha:   z.enum(['FREEZER','AQUECER','CONSERVAR','PREPARAR','SERVIR','ARMAZENAR']),
  litros:  z.string().default(''),
  cores:   z.string().default(''),
  qtd:     z.number().int().min(0),
  valor:   z.number().min(0),
  // Limite de tamanho: uma URL única ou um array JSON de até 5 URLs do
  // Cloudinary cabe folgado em 2048 — evita gravar strings gigantes no banco.
  imagem:   z.string().max(2048).default(''),
  filtros:  z.string().default(''),
  detalhes: z.string().max(5000).nullable().optional(),
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
  const auth = await exigirPermissao(req, 'estoque', 'editar')
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

    // Normaliza a capacidade na entrada: "0;350L" (typo de digitação) →
    // "0.350L". O filtro da loja compara capacidades por igualdade exata,
    // então valores inconsistentes viram opções duplicadas no select.
    const data = {
      ...parsed.data,
      litros: parsed.data.litros.replace(/;/g, '.').trim(),
    }

    const item = await prisma.estoque.create({ data })
    return NextResponse.json(item, { status: 201 })
  } catch (err) {
    console.error('[POST /api/estoque]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}