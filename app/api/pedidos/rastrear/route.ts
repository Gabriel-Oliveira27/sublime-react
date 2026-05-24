import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cpf   = searchParams.get('cpf')?.replace(/\D/g, '')
  const phone = searchParams.get('phone')?.replace(/\D/g, '')
  const id    = searchParams.get('id')?.toUpperCase().trim()

  if (!cpf && !id) {
    return NextResponse.json({ erro: 'Informe id ou cpf' }, { status: 400 })
  }

  try {
    // ── Busca por VD ──────────────────────────────────────────────────────
    if (id) {
      const pedido = await prisma.pedido.findUnique({ where: { idRastreio: id } })
      return NextResponse.json({ order: pedido ?? null })
    }

    // ── Busca por CPF — exige telefone para confirmar identidade ─────────
    if (!phone) {
      return NextResponse.json(
        { erro: 'Informe o telefone de contato para buscar pelo CPF.' },
        { status: 401 }
      )
    }

    const cliente = await prisma.cliente.findUnique({ where: { cpf } })
    if (!cliente) {
      return NextResponse.json({ pedidos: [] }) // não revela se CPF existe
    }

    // Compara apenas dígitos do telefone armazenado
    const phoneSaved = cliente.contato?.replace(/\D/g, '') ?? ''
    if (!phoneSaved || !phoneSaved.includes(phone.slice(-8))) {
      return NextResponse.json(
        { erro: 'Telefone não confere. Verifique o número informado.' },
        { status: 403 }
      )
    }

    // Busca pedidos pelas VDs vinculadas ao cliente
    const vds     = Array.isArray(cliente.compras) ? cliente.compras as string[] : []
    const pedidos = vds.length
      ? await prisma.pedido.findMany({ where: { idRastreio: { in: vds } }, orderBy: { dataCompra: 'desc' } })
      : []

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