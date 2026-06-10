import { CORS_HEADERS, corsOptions } from '@/lib/cors'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar } from '@/lib/middleware'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const createSchema = z.object({
  nome:    z.string().min(2),
  apelido: z.string().min(1),
  email:   z.string().email(),
  // Mínimo 8 caracteres, pelo menos 1 letra e 1 número.
  senha: z.string()
    .min(8,          'Senha deve ter no mínimo 8 caracteres')
    .regex(/[a-zA-Z]/, 'Senha deve conter pelo menos uma letra')
    .regex(/[0-9]/,    'Senha deve conter pelo menos um número'),
  foto:       z.string().url().optional().nullable(),
  permissoes: z.object({
    estoque:  z.object({ ver: z.boolean(), editar: z.boolean() }),
    pedidos:  z.object({ ver: z.boolean(), editar: z.boolean() }),
    cupons:   z.object({ ver: z.boolean(), editar: z.boolean() }),
    config:   z.object({ ver: z.boolean(), editar: z.boolean() }),
    usuarios: z.object({ ver: z.boolean(), editar: z.boolean() }),
  }),
})

/** Lista todos os usuários — apenas Admin */
export async function GET(req: NextRequest) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  if (!auth.usuario.isAdmin) {
    return NextResponse.json({ erro: 'Acesso restrito a administradores' }, { status: 403 })
  }

  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true, nome: true, apelido: true, email: true,
        foto: true, isAdmin: true, permissoes: true, ativo: true, criadoEm: true,
      },
      orderBy: { criadoEm: 'asc' },
    })
    return NextResponse.json(usuarios)
  } catch (err) {
    console.error('[GET /api/usuarios]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

/** Cria novo usuário — apenas Admin */
export async function POST(req: NextRequest) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  if (!auth.usuario.isAdmin) {
    return NextResponse.json({ erro: 'Acesso restrito a administradores' }, { status: 403 })
  }

  try {
    const body   = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { erro: 'Dados inválidos', detalhes: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { nome, apelido, email, senha, foto, permissoes } = parsed.data

    const existe = await prisma.usuario.findUnique({ where: { email } })
    if (existe) {
      return NextResponse.json({ erro: 'E-mail já cadastrado' }, { status: 409 })
    }

    const hash    = await bcrypt.hash(senha, 10)
    const usuario = await prisma.usuario.create({
      data:   { nome, apelido, email: email.toLowerCase(), senha: hash, foto, permissoes, isAdmin: false },
      select: { id: true, nome: true, apelido: true, email: true, foto: true, isAdmin: true, permissoes: true, ativo: true },
    })

    return NextResponse.json(usuario, { status: 201 })
  } catch (err) {
    console.error('[POST /api/usuarios]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}