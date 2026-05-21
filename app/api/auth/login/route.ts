import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signJwt } from '@/lib/jwt'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })
    }

    const { email, senha } = parsed.data

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!usuario || !usuario.ativo) {
      return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 401 })
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha)
    if (!senhaCorreta) {
      return NextResponse.json({ erro: 'Senha incorreta' }, { status: 401 })
    }

    const token = await signJwt({
      id:      usuario.id,
      nome:    usuario.nome,
      apelido: usuario.apelido,
    })

    return NextResponse.json({
      token,
      usuario: {
        id:      usuario.id,
        nome:    usuario.nome,
        apelido: usuario.apelido,
      },
    })
  } catch (err) {
    console.error('[POST /api/auth/login]', err)
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
