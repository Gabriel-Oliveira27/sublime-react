import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar } from '@/lib/middleware'
import { CORS_HEADERS, corsOptions } from '@/lib/cors'
import { checkRateLimit } from '@/app/api/auth/login/ratelimit'
import { z } from 'zod'

// Assinaturas Web Push (PWA).
//   POST   { subscription, escopo? }  → registra/atualiza
//   DELETE { endpoint }               → remove (desinscrição)
//
// escopo 'cliente'  → comprador da loja (público, com rate limit)
// escopo 'vendedor' → dashboard (exige sessão autenticada)

const SubscriptionSchema = z.object({
  endpoint: z.string().url().max(1024),
  keys: z.object({
    p256dh: z.string().min(1).max(256),
    auth:   z.string().min(1).max(256),
  }),
})

const BodySchema = z.object({
  subscription: SubscriptionSchema,
  escopo:       z.enum(['cliente', 'vendedor']).optional().default('cliente'),
})

export async function POST(req: NextRequest) {
  let raw: unknown
  try { raw = await req.json() } catch { raw = null }

  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Assinatura inválida' }, { status: 400, headers: CORS_HEADERS })
  }
  const { subscription, escopo } = parsed.data

  if (escopo === 'vendedor') {
    // Só um vendedor logado registra o dashboard para receber pedidos.
    const auth = await autenticar(req)
    if (auth instanceof NextResponse) return auth
  } else {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rl = checkRateLimit(ip, 'push-web')
    if (!rl.allowed) {
      return NextResponse.json(
        { erro: 'Muitas tentativas. Tente mais tarde.' },
        { status: 429, headers: { ...CORS_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
      )
    }
  }

  try {
    await prisma.webPushSub.upsert({
      where:  { endpoint: subscription.endpoint },
      create: {
        endpoint: subscription.endpoint,
        p256dh:   subscription.keys.p256dh,
        auth:     subscription.keys.auth,
        escopo,
      },
      update: {
        p256dh: subscription.keys.p256dh,
        auth:   subscription.keys.auth,
        escopo,
      },
    })
    return NextResponse.json({ success: true }, { headers: CORS_HEADERS })
  } catch (err) {
    console.error('[POST /api/push/web]', err)
    return NextResponse.json({ erro: 'Erro ao registrar' }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function DELETE(req: NextRequest) {
  let raw: unknown
  try { raw = await req.json() } catch { raw = null }
  const endpoint = (raw as { endpoint?: unknown } | null)?.endpoint

  if (typeof endpoint === 'string' && endpoint) {
    await prisma.webPushSub.deleteMany({ where: { endpoint } }).catch(() => {})
  }
  return NextResponse.json({ success: true }, { headers: CORS_HEADERS })
}

export function OPTIONS() { return corsOptions() }
