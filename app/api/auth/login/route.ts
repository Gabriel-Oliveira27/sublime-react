// Caminho: app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signJwt } from '@/lib/jwt'
import { COOKIE_OPTIONS } from '@/lib/middleware'
import { CORS_HEADERS } from '@/lib/cors'
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
      return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400, headers: CORS_HEADERS })
    }

    const { email, senha } = parsed.data
    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!usuario || !usuario.ativo) {
      return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 401, headers: CORS_HEADERS })
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha)
    if (!senhaCorreta) {
      return NextResponse.json({ erro: 'Senha incorreta' }, { status: 401, headers: CORS_HEADERS })
    }

    const token = await signJwt({
      id:         usuario.id,
      nome:       usuario.nome,
      apelido:    usuario.apelido,
      isAdmin:    usuario.isAdmin,
      permissoes: (usuario.permissoes ?? null) as Record<string, { ver: boolean; editar: boolean }> | null,
    })

    const res = NextResponse.json({
      usuario: {
        id:         usuario.id,
        nome:       usuario.nome,
        apelido:    usuario.apelido,
        foto:       usuario.foto    ?? null,
        isAdmin:    usuario.isAdmin,
        permissoes: usuario.permissoes ?? null,
        tema:       usuario.tema    ?? 'dark',
      },
    }, { headers: CORS_HEADERS })

    res.headers.set('Set-Cookie', `sublime_auth=${token}; ${COOKIE_OPTIONS}`)
    return res
  } catch (err) {
    console.error('[POST /api/auth/login]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500, headers: CORS_HEADERS })
  }
}