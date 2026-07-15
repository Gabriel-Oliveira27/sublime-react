import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/app/api/auth/login/ratelimit'
import { turnstileEnabled, verifyTurnstile } from '@/lib/turnstile'
import { validateCPF } from '@/lib/utils'

/**
 * GET /api/clientes/lookup?cpf=12345678901
 *
 * Fluxo "Já fez alguma compra conosco?" do checkout: devolve nome, telefone
 * e os últimos endereços (até 10) do cliente identificado pelo CPF, para
 * pré-preencher as etapas.
 *
 * Devolve PII — por isso a porta é estreita:
 *  - rate limit por IP (varredura de CPFs em massa não passa);
 *  - captcha Turnstile obrigatório quando configurado (token no header,
 *    nunca na URL — ver CAPTCHA-SETUP.md);
 *  - CPF precisa ter checksum válido antes de tocar o banco.
 *
 * Substitui o antigo /api/clientes/enderecos (que devolvia só endereços,
 * sem captcha).
 */
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = checkRateLimit(ip, 'clientes')
  if (!rl.allowed) {
    return NextResponse.json(
      { erro: 'Muitas consultas. Tente novamente em alguns instantes.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  if (turnstileEnabled()) {
    const captcha = await verifyTurnstile(req.headers.get('x-captcha-token'), ip)
    if (!captcha.ok) {
      console.warn('[clientes/lookup] captcha recusado:', captcha.motivo, 'ip:', ip)
      return NextResponse.json(
        { erro: 'Falha na verificação de segurança. Atualize a página e tente novamente.' },
        { status: 403 }
      )
    }
  }

  const cpf = req.nextUrl.searchParams.get('cpf')?.replace(/\D/g, '') ?? ''
  if (!validateCPF(cpf)) {
    return NextResponse.json({ erro: 'CPF inválido' }, { status: 400 })
  }

  try {
    const cliente = await prisma.cliente.findUnique({
      where:  { cpf },
      select: { nome: true, contato: true, enderecos: true },
    })

    if (!cliente) {
      return NextResponse.json({ found: false })
    }

    // Parseia, deduplica por (cep + número + rua) e devolve os 10 mais recentes
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
    }).slice(0, 10)

    return NextResponse.json({
      found:     true,
      nome:      cliente.nome,
      contato:   cliente.contato || '',
      enderecos: dedup,
    })
  } catch (err) {
    console.error('[GET /api/clientes/lookup]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
