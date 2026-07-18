// app/api/estoque/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { TAG_ESTOQUE } from '@/lib/cache'
import { exigirPermissao } from '@/lib/middleware'
import { CORS_HEADERS, corsOptions } from '@/lib/cors'
import { z } from 'zod'

const patchSchema = z.object({
  qtd:      z.number().int().min(0).optional(),
  valor:    z.number().positive().optional(),
  // URL única ou array JSON de até 5 URLs — cap de tamanho (ver POST /api/estoque)
  imagem:   z.string().max(2048).optional(),
  filtros:  z.string().optional(),
  detalhes: z.string().max(5000).nullable().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await exigirPermissao(req, 'estoque', 'editar')
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const idNum = parseInt(id)
  if (isNaN(idNum)) {
    return NextResponse.json({ erro: 'ID inválido' }, { status: 400, headers: CORS_HEADERS })
  }

  try {
    const body   = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { erro: 'Dados inválidos', detalhes: parsed.error.flatten() },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const item = await prisma.estoque.update({
      where: { id: idNum },
      data:  parsed.data,
    })

    revalidateTag(TAG_ESTOQUE)
    return NextResponse.json(item, { headers: CORS_HEADERS })
  } catch (err) {
    console.error('[PATCH /api/estoque/:id]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await exigirPermissao(req, 'estoque', 'editar')
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const idNum = parseInt(id)
  if (isNaN(idNum)) {
    return NextResponse.json({ erro: 'ID inválido' }, { status: 400, headers: CORS_HEADERS })
  }

  try {
    await prisma.estoque.delete({ where: { id: idNum } })
    revalidateTag(TAG_ESTOQUE)
    return NextResponse.json({ sucesso: true }, { headers: CORS_HEADERS })
  } catch (err) {
    console.error('[DELETE /api/estoque/:id]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500, headers: CORS_HEADERS })
  }
}

export function OPTIONS() { return corsOptions() }