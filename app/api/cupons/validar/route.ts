// ═══════════════════════════════════════════════════════
//  ROTA: /api/cupons/validar
//  GET — público → verifica se um cupom existe e tem usos disponíveis
//                  NÃO consome o cupom (só consulta)
//
//  Query param:  ?code=PROMO10
//
//  Resposta:  { valid: true, desc: "10", cupom: {...} }
//             desc é o valor bruto do campo desconto ("10", "15", "frete grátis")
//             — o mesmo formato que o OrderSummary espera em data.desc
// ═══════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/app/api/auth/login/ratelimit'

export async function GET(req: NextRequest) {
  // Rate limit por IP — sem isso, um bot podia varrer o endpoint público
  // testando códigos até descobrir cupons válidos (coupon enumeration).
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = checkRateLimit(ip, 'cupom')
  if (!rl.allowed) {
    return NextResponse.json(
      { valid: false, erro: 'Muitas tentativas. Aguarde alguns instantes.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  const code = req.nextUrl.searchParams.get('code')?.toUpperCase().trim()

  if (!code || code.length > 50) {
    return NextResponse.json({ erro: 'Código obrigatório' }, { status: 400 })
  }

  try {
    const cupom = await prisma.cupom.findUnique({
      where:  { cupom: code },
      // Projeção mínima: só o que o checkout precisa. NÃO devolver a linha
      // inteira (id, datas e outros campos internos não vão ao público).
      select: { desconto: true, quantidadeUsos: true },
    })

    if (!cupom) {
      return NextResponse.json({ valid: false, erro: 'Cupom não encontrado' }, { status: 404 })
    }

    if (cupom.quantidadeUsos <= 0) {
      return NextResponse.json({ valid: false, erro: 'Cupom esgotado' }, { status: 410 })
    }

    return NextResponse.json({
      valid: true,
      desc:  cupom.desconto,   // ← nível raiz: "10", "15", "frete grátis"
      cupom: { desconto: cupom.desconto, quantidadeUsos: cupom.quantidadeUsos },
    })
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