import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/app/api/auth/login/ratelimit'
import { turnstileEnabled, verifyTurnstile } from '@/lib/turnstile'

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

  // Captcha (Turnstile) — só quando configurado no ambiente. O token vem no
  // header (não na URL, para não vazar em logs de acesso). Junto com o rate
  // limit acima, corta varredura automatizada de VDs/CPFs por bots.
  if (turnstileEnabled()) {
    const captcha = await verifyTurnstile(req.headers.get('x-captcha-token'), ip)
    if (!captcha.ok) {
      console.warn('[rastrear] captcha recusado:', captcha.motivo, 'ip:', ip)
      return NextResponse.json(
        { erro: 'Falha na verificação de segurança. Atualize a página e tente novamente.' },
        { status: 403 }
      )
    }
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
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Captcha-Token',
    },
  })
}
