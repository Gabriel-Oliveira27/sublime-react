import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const PUBLIC_KEYS = [
  'WHATSAPP', 'PIX_KEY',
  'PAGAMENTO_PIX', 'PAGAMENTO_CREDITO', 'PAGAMENTO_DINHEIRO',
  'WHATSAPP_ATIVO',
  'DESCONTO_GLOBAL',
  'DESCONTO_LINHA_FREEZER', 'DESCONTO_LINHA_AQUECER', 'DESCONTO_LINHA_CONSERVAR',
  'DESCONTO_LINHA_PREPARAR', 'DESCONTO_LINHA_SERVIR',  'DESCONTO_LINHA_ARMAZENAR',
  'FRETE_MODELO', 'FRETE_FAIXAS', 'FRETE_CUSTO_KM', 'FRETE_GRATIS_ACIMA_KM',
  'ORIGEM_ENDERECO', 'ORIGEM_LAT', 'ORIGEM_LON', 'ORIGEM_CEP',
]

export async function GET() {
  try {
    const configs = await prisma.config.findMany({
      where: { chave: { in: PUBLIC_KEYS } },
    })
    const m = Object.fromEntries(configs.map(c => [c.chave, c.valor]))

    return NextResponse.json({
      // Legado
      whatsapp: m['WHATSAPP'] ?? '',
      pix:      m['PIX_KEY']  ?? '',
      // Métodos de pagamento (padrão true = habilitado)
      pagamento_pix:      m['PAGAMENTO_PIX']      ?? 'true',
      pagamento_credito:  m['PAGAMENTO_CREDITO']   ?? 'true',
      pagamento_dinheiro: m['PAGAMENTO_DINHEIRO']  ?? 'true',
      // WhatsApp toggle
      whatsapp_ativo: m['WHATSAPP_ATIVO'] ?? 'true',
      // Descontos
      desconto_global: m['DESCONTO_GLOBAL'] ?? '0',
      desconto_linhas: {
        FREEZER:   m['DESCONTO_LINHA_FREEZER']   ?? '0',
        AQUECER:   m['DESCONTO_LINHA_AQUECER']   ?? '0',
        CONSERVAR: m['DESCONTO_LINHA_CONSERVAR'] ?? '0',
        PREPARAR:  m['DESCONTO_LINHA_PREPARAR']  ?? '0',
        SERVIR:    m['DESCONTO_LINHA_SERVIR']    ?? '0',
        ARMAZENAR: m['DESCONTO_LINHA_ARMAZENAR'] ?? '0',
      },
      // Frete
      frete_modelo:          m['FRETE_MODELO']          ?? 'FIXO',
      frete_faixas:          m['FRETE_FAIXAS']          ?? null,
      frete_custo_km:        m['FRETE_CUSTO_KM']        ?? '1.50',
      frete_gratis_acima_km: m['FRETE_GRATIS_ACIMA_KM'] ?? '0',
      // Origem
      origem_endereco: m['ORIGEM_ENDERECO'] ?? '',
      origem_lat:      m['ORIGEM_LAT']      ?? '',
      origem_lon:      m['ORIGEM_LON']      ?? '',
      origem_cep:      m['ORIGEM_CEP']      ?? '',
    })
  } catch (err) {
    console.error('[GET /api/config/public]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
