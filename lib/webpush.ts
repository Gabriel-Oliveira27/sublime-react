// Web Push (PWA) — envia notificações do navegador para clientes da loja e
// para o dashboard do vendedor instalado como PWA.
//
// As assinaturas ficam na tabela WebPushSub (ver prisma/schema.prisma).
// Chaves VAPID vêm do ambiente: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY /
// VAPID_SUBJECT (mailto: ou URL). Sem as chaves, tudo aqui vira no-op —
// a loja continua funcionando normalmente sem push.
//
// Gerar chaves uma única vez:  npx web-push generate-vapid-keys

import webpush from 'web-push'
import { prisma } from './prisma'

export interface WebPushPayload {
  title: string
  body: string
  /** Rota aberta ao tocar na notificação (relativa à origem do site). */
  url?: string
  /** Agrupa/substitui notificações do mesmo assunto. */
  tag?: string
}

let vapidConfigurado = false

export function webPushDisponivel(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

function configurarVapid(): boolean {
  if (!webPushDisponivel()) return false
  if (!vapidConfigurado) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:contato@sublime.app',
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    )
    vapidConfigurado = true
  }
  return true
}

interface SubRow {
  id: number
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * Envia o payload para uma lista de assinaturas. Nunca lança — pensado para
 * fire-and-forget via `after()`. Assinaturas mortas (404/410 do serviço de
 * push) são removidas do banco automaticamente.
 */
export async function enviarWebPush(subs: SubRow[], payload: WebPushPayload): Promise<void> {
  if (subs.length === 0 || !configurarVapid()) return

  const corpo = JSON.stringify(payload)
  const mortas: number[] = []

  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        corpo,
        { TTL: 60 * 60 * 24 },
      )
    } catch (e: unknown) {
      const status = (e as { statusCode?: number })?.statusCode
      if (status === 404 || status === 410) mortas.push(s.id)
      else console.warn('[webpush] falha ao enviar', status ?? e)
    }
  }))

  if (mortas.length) {
    await prisma.webPushSub.deleteMany({ where: { id: { in: mortas } } }).catch(() => {})
  }
}

/** Notifica o(s) navegador(es) do cliente que acompanham um pedido. */
export async function notificarPedidoWeb(idRastreio: string, payload: WebPushPayload): Promise<void> {
  if (!webPushDisponivel()) return
  try {
    const subs = await prisma.webPushSub.findMany({
      where: { escopo: 'cliente', pedidos: { has: idRastreio } },
    })
    await enviarWebPush(subs, { url: '/compras', tag: `pedido-${idRastreio}`, ...payload })
  } catch (e) {
    console.warn('[webpush] notificarPedidoWeb', e)
  }
}

/** Notifica os dashboards dos vendedores instalados como PWA. */
export async function notificarVendedoresWeb(payload: WebPushPayload): Promise<void> {
  if (!webPushDisponivel()) return
  try {
    const subs = await prisma.webPushSub.findMany({ where: { escopo: 'vendedor' } })
    await enviarWebPush(subs, payload)
  } catch (e) {
    console.warn('[webpush] notificarVendedoresWeb', e)
  }
}
