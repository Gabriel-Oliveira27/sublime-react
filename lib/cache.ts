import { unstable_cache } from 'next/cache'
import { prisma } from './prisma'

// ─────────────────────────────────────────────────────────────────────────────
//  Cache de leitura das rotas públicas mais quentes da loja.
//
//  O Neon (plano grátis) é cobrado por horas de computação e dorme quando
//  ocioso — sem cache, CADA visita à loja acorda o banco (estoque + config).
//  Aqui as consultas ficam no Data Cache da Vercel e só rebuscam quando:
//    1. alguma escrita chama revalidateTag() com a tag correspondente, ou
//    2. o TTL de segurança expira (caso uma escrita nova esqueça de invalidar).
//
//  Rotas por-usuário (rastreio, pedidos, cupom) NÃO passam por aqui.
// ─────────────────────────────────────────────────────────────────────────────

export const CACHE_TTL_SEGUNDOS = 2 * 60 * 60 // 2h — rede de segurança, não o mecanismo principal

export const TAG_ESTOQUE = 'estoque'
export const TAG_CONFIG  = 'config'
export const TAG_FRETE   = 'frete'

/** Registro único de FreteConfig — mesma constante usada no PATCH /api/frete. */
export const FRETE_ID = 1

/** Chaves de Config expostas ao público em /api/config/public. */
export const PUBLIC_CONFIG_KEYS = [
  'WHATSAPP', 'PIX_KEY',
  'PAGAMENTO_PIX', 'PAGAMENTO_CREDITO', 'PAGAMENTO_DINHEIRO',
  'WHATSAPP_ATIVO',
  'DESCONTO_GLOBAL',
  'DESCONTO_LINHA_FREEZER', 'DESCONTO_LINHA_AQUECER', 'DESCONTO_LINHA_CONSERVAR',
  'DESCONTO_LINHA_PREPARAR', 'DESCONTO_LINHA_SERVIR',  'DESCONTO_LINHA_ARMAZENAR',
  'FRETE_MODELO', 'FRETE_FAIXAS', 'FRETE_CUSTO_KM', 'FRETE_GRATIS_ACIMA_KM',
  'ORIGEM_ENDERECO', 'ORIGEM_LAT', 'ORIGEM_LON', 'ORIGEM_CEP',
  'PIX_ONLINE_ATIVO', 'PIX_TAXA_MODO', 'PIX_TAXA_FIXA', 'PIX_TAXA_FAIXAS',
  'PIX_TAXA_FRASE',
  'RECEBIMENTO_ENTREGA', 'RECEBIMENTO_RETIRADA',
  'RETIRADA_HORA_INICIO', 'RETIRADA_HORA_FIM',
]

export const getEstoqueCached = unstable_cache(
  () => prisma.estoque.findMany({ orderBy: { produto: 'asc' } }),
  ['estoque-list'],
  { tags: [TAG_ESTOQUE], revalidate: CACHE_TTL_SEGUNDOS }
)

export const getConfigPublicCached = unstable_cache(
  () => prisma.config.findMany({ where: { chave: { in: PUBLIC_CONFIG_KEYS } } }),
  ['config-public'],
  { tags: [TAG_CONFIG], revalidate: CACHE_TTL_SEGUNDOS }
)

export const getFreteCached = unstable_cache(
  () => prisma.freteConfig.findUnique({ where: { id: FRETE_ID } }),
  ['frete-config'],
  { tags: [TAG_FRETE], revalidate: CACHE_TTL_SEGUNDOS }
)
