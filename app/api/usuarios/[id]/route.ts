import { CORS_HEADERS, corsOptions } from '@/lib/cors'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar } from '@/lib/middleware'
import bcrypt from 'bcryptjs'
import { z } from 'zod'


const TEMAS = ['dark', 'light', 'violet', 'midnight', 'forest', 'rose'] as const

const updateSchema = z.object({
  nome:       z.string().min(2).optional(),
  apelido:    z.string().min(1).optional(),
  foto:       z.string().url().nullable().optional(),
  tema:       z.enum(TEMAS).optional(),
  ativo:      z.boolean().optional(),
  senha:      z.string().min(6).optional(),
  permissoes: z.object({
    estoque:  z.object({ ver: z.boolean(), editar: z.boolean() }),
    pedidos:  z.object({ ver: z.boolean(), editar: z.boolean() }),
    cupons:   z.object({ ver: z.boolean(), editar: z.boolean() }),
    config:   z.object({ ver: z.boolean(), editar: z.boolean() }),
    usuarios: z.object({ ver: z.boolean(), editar: z.boolean() }),
  }).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const idNum     = parseInt(id)
  const ehAdmin   = auth.usuario.isAdmin
  const ehProprio = auth.usuario.id === idNum

  if (!ehAdmin && !ehProprio) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403, headers: CORS_HEADERS })
  }

  try {
    const body   = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { erro: 'Dados inválidos', detalhes: parsed.error.flatten() },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const { senha, permissoes, ativo, ...resto } = parsed.data
    const data: Record<string, unknown> = { ...resto }

    if (ehAdmin && permissoes)              data.permissoes = permissoes
    if (ehAdmin && typeof ativo === 'boolean') data.ativo   = ativo
    if (senha)                              data.senha      = await bcrypt.hash(senha, 10)

    const atualizado = await prisma.usuario.update({
      where:  { id: idNum },
      data,
      select: {
        id: true, nome: true, apelido: true, email: true,
        foto: true, isAdmin: true, permissoes: true, ativo: true, tema: true,
      },
    })

    return NextResponse.json(atualizado, { headers: CORS_HEADERS })
  } catch (err) {
    console.error('[PATCH /api/usuarios/:id]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  if (!auth.usuario.isAdmin) {
    return NextResponse.json(
      { erro: 'Acesso restrito a administradores' },
      { status: 403, headers: CORS_HEADERS }
    )
  }

  const { id } = await params
  const idNum   = parseInt(id)

  if (auth.usuario.id === idNum) {
    return NextResponse.json(
      { erro: 'Você não pode desativar sua própria conta' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  try {
    const alvo = await prisma.usuario.findUnique({ where: { id: idNum } })
    if (alvo?.isAdmin) {
      return NextResponse.json(
        { erro: 'Não é possível remover outro administrador' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    await prisma.usuario.update({ where: { id: idNum }, data: { ativo: false } })
    return NextResponse.json({ sucesso: true }, { headers: CORS_HEADERS })
  } catch (err) {
    console.error('[DELETE /api/usuarios/:id]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500, headers: CORS_HEADERS })
  }
}

export function OPTIONS() { return corsOptions() }
