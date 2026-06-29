import { prisma } from '@/lib/prisma'

// ─────────────────────────────────────────────────────────────────────────────
// Push (Expo) — notifica os apps dos vendedores quando algo acontece (ex.: novo
// pedido). Os tokens dos dispositivos são guardados na tabela Config (key/value)
// sob a chave PUSH_TOKENS como um array JSON — assim não precisamos de migração
// de schema. O envio usa direto a Expo Push API (sem SDK extra).
// ─────────────────────────────────────────────────────────────────────────────

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const TOKENS_KEY = 'PUSH_TOKENS'

/** Formato de um token do Expo: ExponentPushToken[xx…] ou ExpoPushToken[xx…]. */
export function isExpoPushToken(token: unknown): token is string {
  return typeof token === 'string' && /^Expo(nent)?PushToken\[.+\]$/.test(token)
}

async function readTokens(): Promise<string[]> {
  const row = await prisma.config.findUnique({ where: { chave: TOKENS_KEY } })
  if (!row?.valor) return []
  try {
    const arr = JSON.parse(row.valor)
    return Array.isArray(arr) ? arr.filter(isExpoPushToken) : []
  } catch {
    return []
  }
}

async function writeTokens(tokens: string[]): Promise<void> {
  const valor = JSON.stringify([...new Set(tokens)])
  await prisma.config.upsert({
    where:  { chave: TOKENS_KEY },
    create: { chave: TOKENS_KEY, valor },
    update: { valor },
  })
}

export async function registerPushToken(token: string): Promise<void> {
  if (!isExpoPushToken(token)) throw new Error('Token de push inválido')
  const tokens = await readTokens()
  if (!tokens.includes(token)) {
    tokens.push(token)
    await writeTokens(tokens)
  }
}

export async function removePushToken(token: string): Promise<void> {
  const tokens = await readTokens()
  const next = tokens.filter((t) => t !== token)
  if (next.length !== tokens.length) await writeTokens(next)
}

export interface PushMessage {
  title: string
  body: string
  data?: Record<string, unknown>
}

/**
 * Envia uma notificação para TODOS os dispositivos registrados (vendedores).
 * Pensado para fire-and-forget (chamar via `after()`): nunca lança — apenas
 * loga. Tokens inválidos (DeviceNotRegistered) são removidos automaticamente.
 */
export async function sendPushToAll(msg: PushMessage): Promise<void> {
  let tokens: string[]
  try {
    tokens = await readTokens()
  } catch (e) {
    console.warn('[push] não foi possível ler tokens', e)
    return
  }
  if (tokens.length === 0) return

  const messages = tokens.map((to) => ({
    to,
    title:     msg.title,
    body:      msg.body,
    data:      msg.data ?? {},
    sound:     'default',
    priority:  'high',
    channelId: 'novos-pedidos',
  }))

  const invalid: string[] = []

  // Expo aceita até 100 mensagens por request.
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100)
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type':    'application/json',
          Accept:            'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(chunk),
      })
      const json = (await res.json().catch(() => null)) as
        | { data?: Array<{ status: string; details?: { error?: string } }> }
        | null
      const tickets = json?.data ?? []
      tickets.forEach((t, idx) => {
        if (t?.status === 'error' && t.details?.error === 'DeviceNotRegistered') {
          invalid.push(chunk[idx].to)
        }
      })
    } catch (e) {
      console.warn('[push] falha ao enviar chunk', e)
    }
  }

  if (invalid.length) {
    const next = tokens.filter((t) => !invalid.includes(t))
    await writeTokens(next).catch(() => {})
  }
}
