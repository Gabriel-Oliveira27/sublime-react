
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar } from '@/lib/middleware'

export async function GET() {
  try {
    const estoque = await prisma.estoque.findMany({
      orderBy: { produto: 'asc' },
    })
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
    const body = await req.json()
    const item = await prisma.estoque.create({ data: body })
    return NextResponse.json(item, { status: 201 })
  } catch (err) {
    console.error('[POST /api/estoque]', err)
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