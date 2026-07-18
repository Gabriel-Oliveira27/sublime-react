import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { TAG_CONFIG } from '@/lib/cache'
import { autenticar, exigirPermissao } from '@/lib/middleware'
import { z } from 'zod'

const patchSchema = z.object({
  chave: z.string().min(1),
})

export async function GET(req: NextRequest) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  try {
    const config = await prisma.config.findUnique({
      where: { chave: 'PIX_KEY' },
    })
    return NextResponse.json({ chave: config?.valor ?? '' })
  } catch (err) {
    console.error('[GET /api/config/pix]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await exigirPermissao(req, 'config', 'editar')
  if (auth instanceof NextResponse) return auth

  try {
    const body   = await req.json()
    const parsed = patchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ erro: 'Chave inválida' }, { status: 400 })
    }

    const config = await prisma.config.upsert({
      where:  { chave: 'PIX_KEY' },
      update: { valor: parsed.data.chave },
      create: { chave: 'PIX_KEY', valor: parsed.data.chave },
    })

    // PIX_KEY é uma das chaves públicas — invalida o cache da loja.
    revalidateTag(TAG_CONFIG)
    return NextResponse.json({ chave: config.valor })
  } catch (err) {
    console.error('[PATCH /api/config/pix]', err)
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
