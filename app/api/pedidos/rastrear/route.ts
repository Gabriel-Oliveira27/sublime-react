import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/app/api/auth/login/ratelimit'

// Projeção mínima devolvida ao público. NUNCA inclui nome, contato (telefone),
// endereço ou CPF — só o necessário para a tela de acompanhamento montar a
// timeline e o resumo. Isso corta o vazamento de PII por enumeração de VDs
// sequenciais (VD-001, VD-002, …) num endpoint sem autenticação.
const PUBLIC_SELECT = {
  idRastreio: true,
  etapa:      true,
  pedido:     true,
  totalVenda: true,
  dataCompra: true,
} as const

export async function GET(req: NextRequest) {
  // Rate limit por IP — dificulta varredura em massa de VDs/CPFs.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = checkRateLimit(ip, 'rastrear')
  if (!rl.allowed) {
    return NextResponse.json(
      { erro: 'Muitas consultas. Tente novamente em alguns instantes.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

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
      const pedido = await prisma.pedido.findUnique({
        where:  { idRastreio: id },
        select: PUBLIC_SELECT,
      })
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

    // Busca pedidos pelas VDs vinculadas ao cliente (mesma projeção mínima)
    const vds     = Array.isArray(cliente.compras) ? cliente.compras as string[] : []
    const pedidos = vds.length
      ? await prisma.pedido.findMany({
          where:   { idRastreio: { in: vds } },
          orderBy: { dataCompra: 'desc' },
          select:  PUBLIC_SELECT,
        })
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
