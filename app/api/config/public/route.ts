import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const PUBLIC_KEYS = [
  'WHATSAPP', 'PIX_KEY',
  'PAGAMENTO_PIX', 'PAGAMENTO_CREDITO', 'PAGAMENTO_DINHEIRO',
  'WHATSAPP_ATIVO',
  'DESCONTO_GLOBAL',
  'DESCONTO_LINHA_FREEZER', 'DESCONTO_LINHA_AQUECER', 'DESCONTO_LINHA_CONSERVAR',
  'DESCONTO_LINHA_PREPARAR', 'DESCONTO_LINHA_SERVIR', 'DESCONTO_LINHA_ARMAZENAR',
  // Chaves legadas de frete — lidas para fallback mas FreteConfig tem prioridade
  'ORIGEM_ENDERECO', 'ORIGEM_LAT', 'ORIGEM_LON', 'ORIGEM_CEP',
]

function defaultFrete() {
  return {
    modelo: 'VALOR',
    tiersValor: [
      { ate: 129, taxa: 0 }, { ate: 200, taxa: 1.50 }, { ate: 270, taxa: 3.00 },
      { ate: 349, taxa: 5.00 }, { ate: 419, taxa: 7.00 }, { ate: null, taxa: 10.00 },
    ],
    origemLat: null, origemLon: null,
    origemEndereco: '', origemCep: '', origemCidade: '', origemUF: '',
    custoKm: 1.50, freteGratisAteKm: 0,
    valorFixo: 0, valorCidadeOrigem: 0, valorDemais: 0, cidadesEspeciais: [],
  }
}

export async function GET() {
  try {
    const [configs, freteConfig] = await Promise.all([
      prisma.config.findMany({ where: { chave: { in: PUBLIC_KEYS } } }),
      prisma.freteConfig.findUnique({ where: { id: 1 } }),
    ])

    const m = Object.fromEntries(configs.map(c => [c.chave, c.valor]))

    // Frete: FreteConfig tem prioridade total sobre chaves legadas da Config
    const frete = freteConfig
      ? {
          modelo:            freteConfig.modelo,
          tiersValor:        freteConfig.tiersValor        ?? defaultFrete().tiersValor,
          origemLat:         freteConfig.origemLat,
          origemLon:         freteConfig.origemLon,
          origemEndereco:    freteConfig.origemEndereco,
          origemCep:         freteConfig.origemCep,
          origemCidade:      freteConfig.origemCidade,
          origemUF:          freteConfig.origemUF,
          custoKm:           freteConfig.custoKm,
          freteGratisAteKm:  freteConfig.freteGratisAteKm,
          valorFixo:         freteConfig.valorFixo,
          valorCidadeOrigem: freteConfig.valorCidadeOrigem,
          valorDemais:       freteConfig.valorDemais,
          cidadesEspeciais:  freteConfig.cidadesEspeciais  ?? [],
        }
      : defaultFrete()

    return NextResponse.json({
      // Legado
      whatsapp: m['WHATSAPP'] ?? '',
      pix:      m['PIX_KEY']  ?? '',
      // Métodos de pagamento
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
      // Frete — objeto completo com o modelo ativo e todos os campos
      frete,
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
