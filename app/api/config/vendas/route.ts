import { CORS_HEADERS, corsOptions } from '@/lib/cors'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar, exigirPermissao } from '@/lib/middleware'
import { z } from 'zod'

// Atalho legado { pix?, whatsapp? }
const schema = z.object({
  pix:      z.string().optional(),
  whatsapp: z.string().optional(),
})

// Chaves estendidas lidas pela loja em /api/config/public e editadas no
// dashboard (toggles de pagamento, WhatsApp e descontos), com defaults.
const EXTRA_DEFAULTS: Record<string, string> = {
  WHATSAPP_ATIVO:           'true',
  PAGAMENTO_PIX:            'true',
  PAGAMENTO_CREDITO:        'true',
  PAGAMENTO_DINHEIRO:       'true',
  DESCONTO_GLOBAL:          '0',
  DESCONTO_LINHA_FREEZER:   '0',
  DESCONTO_LINHA_AQUECER:   '0',
  DESCONTO_LINHA_CONSERVAR: '0',
  DESCONTO_LINHA_PREPARAR:  '0',
  DESCONTO_LINHA_SERVIR:    '0',
  DESCONTO_LINHA_ARMAZENAR: '0',
}

// Chaves que o PATCH { chave, valor } pode gravar (allow-list — nunca gravar
// chave arbitrária vinda do cliente). Inclui chaves legadas de origem/frete.
const ALLOWED_KEYS = new Set<string>([
  'PIX_KEY', 'WHATSAPP',
  ...Object.keys(EXTRA_DEFAULTS),
  'ORIGEM_ENDERECO', 'ORIGEM_LAT', 'ORIGEM_LON', 'ORIGEM_CEP',
])

const ALL_KEYS = ['PIX_KEY', 'WHATSAPP', ...Object.keys(EXTRA_DEFAULTS)]

/** Normaliza o valor conforme a chave (toggles → true/false, descontos → 0-100). */
function normalizeConfigValue(chave: string, raw: string): string {
  if (chave === 'WHATSAPP_ATIVO' || chave.startsWith('PAGAMENTO_')) {
    return raw === 'false' ? 'false' : 'true'
  }
  if (chave === 'DESCONTO_GLOBAL' || chave.startsWith('DESCONTO_LINHA_')) {
    return String(Math.max(0, Math.min(100, parseInt(raw) || 0)))
  }
  return raw
}

export async function GET(req: NextRequest) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  try {
    const configs = await prisma.config.findMany({ where: { chave: { in: ALL_KEYS } } })
    const map = Object.fromEntries(configs.map(c => [c.chave, c.valor]))

    // Chaves estendidas com seus defaults — para o dashboard exibir o estado real.
    const extras = Object.fromEntries(
      Object.entries(EXTRA_DEFAULTS).map(([k, def]) => [k, map[k] ?? def])
    )

    return NextResponse.json({
      pix:      map['PIX_KEY'] ?? '',
      whatsapp: map['WHATSAPP'] ?? '',
      ...extras,
    }, { headers: CORS_HEADERS })
  } catch (err) {
    console.error('[GET /api/config/vendas]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await exigirPermissao(req, 'config', 'editar')
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()

    // Forma 1: { chave, valor } — usada pelo dashboard para gravar toggles de
    // pagamento, WHATSAPP_ATIVO e descontos. Antes era silenciosamente ignorada.
    if (typeof body?.chave === 'string') {
      const chave = body.chave.trim()
      if (!ALLOWED_KEYS.has(chave)) {
        return NextResponse.json({ erro: `Chave não permitida: ${chave}` }, { status: 400, headers: CORS_HEADERS })
      }
      const valor = normalizeConfigValue(chave, String(body.valor ?? ''))
      await prisma.config.upsert({ where: { chave }, update: { valor }, create: { chave, valor } })
      return NextResponse.json({ sucesso: true }, { headers: CORS_HEADERS })
    }

    // Forma 2 (legado): { pix?, whatsapp? }
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400, headers: CORS_HEADERS })
    }

    const updates = []
    if (parsed.data.pix !== undefined) {
      updates.push(prisma.config.upsert({
        where:  { chave: 'PIX_KEY' },
        update: { valor: parsed.data.pix },
        create: { chave: 'PIX_KEY', valor: parsed.data.pix },
      }))
    }
    if (parsed.data.whatsapp !== undefined) {
      updates.push(prisma.config.upsert({
        where:  { chave: 'WHATSAPP' },
        update: { valor: parsed.data.whatsapp },
        create: { chave: 'WHATSAPP', valor: parsed.data.whatsapp },
      }))
    }

    await Promise.all(updates)
    return NextResponse.json({ sucesso: true }, { headers: CORS_HEADERS })
  } catch (err) {
    console.error('[PATCH /api/config/vendas]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function OPTIONS() {
  return corsOptions()
}
