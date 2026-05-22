import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cpf = searchParams.get('cpf')?.replace(/\D/g, '')
  const id  = searchParams.get('id')?.toUpperCase().trim()

  if (!cpf && !id) {
    return NextResponse.json({ erro: 'Informe cpf ou id' }, { status: 400 })
  }

  try {
    if (id) {
      const pedido = await prisma.pedido.findUnique({ where: { idRastreio: id } })
      return NextResponse.json({ order: pedido ?? null })
    }

    const pedidos = await prisma.pedido.findMany({
      where:   { contato: { contains: cpf! } },
      orderBy: { dataCompra: 'desc' },
    })
    return NextResponse.json({ pedidos })
  } catch (err) {
    console.error('[GET /api/pedidos/rastrear]', err)
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