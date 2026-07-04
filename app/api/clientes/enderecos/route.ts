import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/app/api/auth/login/ratelimit'

/**
 * GET /api/clientes/enderecos?cpf=12345678901
 *
 * Retorna os últimos endereços salvos de um cliente identificado pelo CPF.
 * Não expõe nome, contato ou histórico de compras — apenas endereços.
 *
 * É um endpoint público (o checkout pré-preenche o endereço ao digitar o CPF),
 * então tem rate limit por IP para impedir varredura em massa de CPFs.
 */
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = checkRateLimit(ip, 'enderecos')
  if (!rl.allowed) {
    return NextResponse.json(
      { enderecos: [] },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  const cpf = req.nextUrl.searchParams.get('cpf')?.replace(/\D/g, '') ?? ''
  if (cpf.length !== 11) {
    return NextResponse.json({ enderecos: [] })
  }

  try {
    const cliente = await prisma.cliente.findUnique({
      where:  { cpf },
      select: { enderecos: true },
    })

    if (!cliente || !cliente.enderecos.length) {
      return NextResponse.json({ enderecos: [] })
    }

    // Parseia, desserializa e deduplica por (cep + number), retorna os 3 mais recentes
    const parsed = cliente.enderecos
      .map(e => { try { return JSON.parse(e) } catch { return null } })
      .filter(Boolean)
      .reverse() // mais recente primeiro

    const seen  = new Set<string>()
    const dedup = parsed.filter(a => {
      const key = `${a.cep ?? ''}-${a.number ?? ''}-${a.street ?? ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, 3)

    return NextResponse.json({ enderecos: dedup })
  } catch (err) {
    console.error('[GET /api/clientes/enderecos]', err)
    return NextResponse.json({ enderecos: [] })
  }
}