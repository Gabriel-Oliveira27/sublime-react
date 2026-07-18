import { NextResponse } from 'next/server'
import { getConfigPublicCached } from '@/lib/cache'

// As chaves públicas (PUBLIC_CONFIG_KEYS) e a consulta cacheada moram em
// lib/cache.ts — invalidação via revalidateTag(TAG_CONFIG) nas rotas de escrita.

export async function GET() {
  try {
    const configs = await getConfigPublicCached()
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
      // PIX online (pagar agora) + taxa de serviço
      pix_online_ativo: m['PIX_ONLINE_ATIVO'] ?? 'false',
      pix_taxa_modo:    m['PIX_TAXA_MODO']    ?? 'NULA',
      pix_taxa_fixa:    m['PIX_TAXA_FIXA']    ?? '{"tipo":"PERCENT","valor":0}',
      pix_taxa_faixas:  m['PIX_TAXA_FAIXAS']  ?? '[]',
      // Frase exibida no "?" da taxa de serviço (vazia = texto padrão da loja)
      pix_taxa_frase:   m['PIX_TAXA_FRASE']   ?? '',
      // Recebimento: formas oferecidas + janela de horários da retirada
      recebimento_entrega:  m['RECEBIMENTO_ENTREGA']  ?? 'true',
      recebimento_retirada: m['RECEBIMENTO_RETIRADA'] ?? 'true',
      retirada_hora_inicio: m['RETIRADA_HORA_INICIO'] ?? '08:00',
      retirada_hora_fim:    m['RETIRADA_HORA_FIM']    ?? '19:00',
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
