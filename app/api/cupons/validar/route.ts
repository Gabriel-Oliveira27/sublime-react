import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.toUpperCase().trim()

  if (!code) {
    return NextResponse.json({ erro: 'Código obrigatório' }, { status: 400 })
  }

  try {
    const cupom = await prisma.cupom.findUnique({ where: { cupom: code } })

    if (!cupom) {
      return NextResponse.json({ valid: false, erro: 'Cupom não encontrado' }, { status: 404 })
    }

    if (cupom.quantidadeUsos <= 0) {
      return NextResponse.json({ valid: false, erro: 'Cupom esgotado' }, { status: 410 })
    }

    return NextResponse.json({ valid: true, cupom })
  } catch (err) {
    console.error('[GET /api/cupons/validar]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
  })
}