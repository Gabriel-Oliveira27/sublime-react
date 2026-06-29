import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar, exigirPermissao } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  try {
    const cupons = await prisma.cupom.findMany({ orderBy: { id: 'asc' } })
    return NextResponse.json(cupons)
  } catch (err) {
    console.error('[GET /api/cupons]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await exigirPermissao(req, 'cupons', 'editar')
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const { cupom, desconto, quantidadeUsos } = body

    if (!cupom || !desconto || quantidadeUsos == null) {
      return NextResponse.json({ erro: 'Campos obrigatórios: cupom, desconto, quantidadeUsos' }, { status: 400 })
    }

    const novo = await prisma.cupom.create({
      data: {
        cupom:          String(cupom).toUpperCase().trim(),
        desconto:       String(desconto).trim(),
        quantidadeUsos: Number(quantidadeUsos),
      },
    })
    return NextResponse.json(novo, { status: 201 })
  } catch (err: any) {
    // P2002 = unique constraint (código duplicado)
    if (err?.code === 'P2002') {
      return NextResponse.json({ erro: 'Já existe um cupom com esse código' }, { status: 409 })
    }
    console.error('[POST /api/cupons]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
  })
}