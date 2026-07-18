import { CORS_HEADERS, corsOptions } from '@/lib/cors'
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { TAG_CONFIG } from '@/lib/cache'
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
  // ── PIX online (Mercado Pago) ──────────────────────────────────────────────
  // Ativa o "pagar agora" (QR gerado na hora, confirmação automática).
  PIX_ONLINE_ATIVO:         'false',
  // Modelo da taxa de serviço: NULA | FIXA | FAIXAS
  PIX_TAXA_MODO:            'NULA',
  // FIXA: { tipo: 'PERCENT'|'REAIS', valor: number }
  PIX_TAXA_FIXA:           '{"tipo":"PERCENT","valor":0}',
  // FAIXAS: [{ min, tipo, valor }] — taxa por valor mínimo de compra
  PIX_TAXA_FAIXAS:         '[]',
  // Frase exibida no "?" da taxa de serviço no checkout (vazia = texto padrão)
  PIX_TAXA_FRASE:          '',
  // ── Recebimento ─────────────────────────────────────────────────────────────
  // Formas de recebimento oferecidas no checkout
  RECEBIMENTO_ENTREGA:     'true',
  RECEBIMENTO_RETIRADA:    'true',
  // Janela de horários de retirada (o checkout monta slots de 30 em 30 min)
  RETIRADA_HORA_INICIO:    '08:00',
  RETIRADA_HORA_FIM:       '19:00',
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
  if (
    chave === 'WHATSAPP_ATIVO' || chave.startsWith('PAGAMENTO_') ||
    chave === 'PIX_ONLINE_ATIVO' || chave.startsWith('RECEBIMENTO_')
  ) {
    return raw === 'true' ? 'true' : 'false'
  }
  if (chave === 'RETIRADA_HORA_INICIO' || chave === 'RETIRADA_HORA_FIM') {
    // HH:MM com minutos travados em 00 ou 30 (os slots são de meia em meia hora)
    const m = /^(\d{1,2}):(\d{2})$/.exec(raw.trim())
    const hora = m ? Math.min(23, Math.max(0, parseInt(m[1]))) : null
    if (hora === null) return chave === 'RETIRADA_HORA_INICIO' ? '08:00' : '19:00'
    const minuto = parseInt(m![2]) >= 30 ? '30' : '00'
    return `${String(hora).padStart(2, '0')}:${minuto}`
  }
  if (chave === 'DESCONTO_GLOBAL' || chave.startsWith('DESCONTO_LINHA_')) {
    return String(Math.max(0, Math.min(100, parseInt(raw) || 0)))
  }
  if (chave === 'PIX_TAXA_MODO') {
    return ['NULA', 'FIXA', 'FAIXAS'].includes(raw) ? raw : 'NULA'
  }
  if (chave === 'PIX_TAXA_FIXA' || chave === 'PIX_TAXA_FAIXAS') {
    // Só grava se for JSON válido — nunca aceita string arbitrária do cliente.
    try { JSON.parse(raw); return raw } catch { return chave === 'PIX_TAXA_FAIXAS' ? '[]' : '{"tipo":"PERCENT","valor":0}' }
  }
  if (chave === 'PIX_TAXA_FRASE') {
    // Texto livre exibido no checkout (React escapa na renderização) — só
    // limita o tamanho para não virar um parágrafo gigante no tooltip.
    return raw.trim().slice(0, 300)
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
      revalidateTag(TAG_CONFIG)
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
    if (updates.length) revalidateTag(TAG_CONFIG)
    return NextResponse.json({ sucesso: true }, { headers: CORS_HEADERS })
  } catch (err) {
    console.error('[PATCH /api/config/vendas]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function OPTIONS() {
  return corsOptions()
}
