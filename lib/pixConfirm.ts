// Confirmação de pagamento PIX — ponto ÚNICO que marca um pedido como pago.
// Usado pelo webhook do Mercado Pago (produção) e pela rota /simular (mock local).
// É idempotente: confirmar duas vezes não faz nada na segunda.

import { prisma } from './prisma'
import { sendPushToAll } from './push'
import { notificarPedidoWeb } from './webpush'

interface ConfirmarInput {
  pspPaymentId?: string
  orderId?: string
  /** Se informado, o total do pedido precisa bater (anti-fraude de valor). */
  valorEsperado?: number
}

export async function confirmarPagamentoPix(input: ConfirmarInput): Promise<boolean> {
  const pedido = input.pspPaymentId
    ? await prisma.pedido.findUnique({ where: { pspPaymentId: input.pspPaymentId } })
    : input.orderId
      ? await prisma.pedido.findUnique({ where: { idRastreio: input.orderId } })
      : null

  if (!pedido) return false
  if (pedido.pagamento === 'REALIZADO') return true // idempotente

  // Confere o valor pago contra o total do pedido (evita "pagar menos").
  if (input.valorEsperado != null && Math.abs(Number(pedido.totalVenda) - input.valorEsperado) > 0.01) {
    return false
  }

  await prisma.pedido.update({
    where: { id: pedido.id },
    data:  { pagamento: 'REALIZADO' },
  })

  // Avisa os vendedores (não bloqueia).
  sendPushToAll({
    title: 'Pagamento confirmado',
    body:  `Pedido ${pedido.idRastreio} foi pago via PIX.`,
    data:  { type: 'pagamento-confirmado', orderId: pedido.idRastreio },
  }).catch(() => {})

  // Avisa o CLIENTE (PWA da loja), se ele ativou notificações.
  const retirada = pedido.endereco.startsWith('Retirada')
  notificarPedidoWeb(pedido.idRastreio, {
    title: 'Seu pagamento foi confirmado!',
    body: retirada
      ? 'Agora é só ir retirar no endereço do vendedor.'
      : 'Agora é só esperar o seu produto chegar.',
  }).catch(() => {})

  return true
}
