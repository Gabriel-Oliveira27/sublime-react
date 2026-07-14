import { z } from 'zod'

export const ItemPedidoSchema = z.object({
  // O carrinho guarda o id como string ("5"); coerce aceita string ou número.
  id:        z.coerce.number().int().positive(),
  descricao: z.string().min(1),
  cores:     z.string().nullable().optional(),
  imagem:    z.string().optional(),
  qty:       z.coerce.number().int().positive().max(999),
  // O preço NÃO é confiável vindo do cliente — o servidor recalcula a partir
  // do banco (ver app/api/pedidos/route.ts). Aceito como opcional só para
  // compatibilidade; é ignorado no cálculo do total.
  valor:     z.union([z.number(), z.string()]).optional(),
  qtd:       z.coerce.number().int().nonnegative().optional(),
})

// O checkout usa rótulos com case misto ("Dinheiro", "Credito").
// Normaliza para o enum canônico em maiúsculas antes de validar.
const MetodoPagamentoSchema = z.preprocess(
  (v) => (typeof v === 'string' ? v.toUpperCase() : v),
  z.enum(['PIX', 'DINHEIRO', 'CREDITO'])
)

export const PedidoBodySchema = z.object({
  customer: z.object({
    name:  z.string().min(2, 'Nome muito curto'),
    phone: z.string().regex(/^\+?[\d\s\-().]{8,20}$/).optional(),
    cpf:   z.string().optional(),
  }),

  items: z.array(ItemPedidoSchema).min(1, 'Carrinho vazio'),

  delivery: z.object({
    type:         z.enum(['entrega', 'retirada']),
    address:      z.string().optional(),
    frete:        z.number().nonnegative().optional(),
    cep:          z.string().optional(),
    street:       z.string().optional(),
    number:       z.string().optional(),
    complement:   z.string().optional(),
    neighborhood: z.string().optional(),
    city:         z.string().optional(),
    state:        z.string().optional(),
  }),

  payment: z.object({
    method:       MetodoPagamentoSchema,
    installments: z.coerce.number().int().min(1).max(12).optional(),
    changeFor:    z.coerce.number().nonnegative().optional(),
    // PIX "pagar agora" (online). Só tem efeito se method === PIX E o servidor
    // confirmar que PIX_ONLINE_ATIVO está ligado — nunca confiar só nesta flag.
    online:       z.boolean().optional(),
  }),

  coupon:              z.string().nullable().optional(),
  total:               z.number().nonnegative(),
  // Token do Cloudflare Turnstile (anti-bot). Opcional no schema — a
  // obrigatoriedade é decidida no servidor conforme TURNSTILE_SECRET_KEY.
  captchaToken:        z.string().max(2048).nullable().optional(),
  // O checkout envia `null` na retirada (sem endereço de entrega) — sem o
  // .nullable() o Zod rejeitava o pedido inteiro com "Dados inválidos".
  enderecoEstruturado: z.record(z.string(), z.unknown()).nullable().optional(),
})

export type PedidoBody = z.infer<typeof PedidoBodySchema>