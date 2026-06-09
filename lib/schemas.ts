import { z } from 'zod'

export const ItemPedidoSchema = z.object({
  id:        z.number().int().positive(),
  descricao: z.string().min(1),
  cores:     z.string().nullable().optional(),
  imagem:    z.string().optional(),
  qty:       z.number().int().positive().max(999),
  valor:     z.union([z.number(), z.string()]),
  qtd:       z.number().int().nonnegative().optional(),
})

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
    method:       z.enum(['PIX', 'DINHEIRO', 'CREDITO']),
    installments: z.number().int().min(1).max(12).optional(),
    changeFor:    z.number().nonnegative().optional(),
  }),

  coupon:              z.string().nullable().optional(),
  total:               z.number().nonnegative(),
  enderecoEstruturado: z.record(z.string(), z.unknown()).optional(),
})

export type PedidoBody = z.infer<typeof PedidoBodySchema>