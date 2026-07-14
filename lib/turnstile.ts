// lib/turnstile.ts
//
// Verificação server-side do Cloudflare Turnstile (anti-bot).
//
// O captcha é OPCIONAL por configuração: só entra em ação quando
// TURNSTILE_SECRET_KEY está definida no ambiente. Sem a chave, os endpoints
// funcionam como antes — isso mantém dev local e instâncias whitelabel ainda
// não configuradas funcionando, e permite ligar a proteção por loja.
//
// Setup completo em CAPTCHA-SETUP.md.

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** Captcha está ligado neste ambiente? (chave secreta presente) */
export function turnstileEnabled(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY
}

export interface TurnstileResult {
  ok: boolean
  /** Motivo interno (log) — nunca devolver cru ao cliente. */
  motivo?: string
}

/**
 * Valida um token do widget junto à Cloudflare.
 *
 * Política de falha:
 * - Token ausente ou recusado pela Cloudflare → ok:false (fail-closed).
 * - Cloudflare fora do ar / timeout de rede   → ok:true  (fail-open, com log).
 *   Uma indisponibilidade do serviço de captcha não pode derrubar vendas nem
 *   rastreio — o rate-limit por IP continua ativo como segunda linha.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  ip?: string
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return { ok: true, motivo: 'captcha desativado' }

  if (!token || typeof token !== 'string') {
    return { ok: false, motivo: 'token ausente' }
  }

  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), 6000)

  try {
    const body = new URLSearchParams({ secret, response: token.slice(0, 2048) })
    if (ip && ip !== 'unknown') body.set('remoteip', ip)

    const res = await fetch(VERIFY_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal:  controller.signal,
    })

    if (!res.ok) {
      console.warn('[turnstile] siteverify HTTP', res.status, '— fail-open')
      return { ok: true, motivo: `siteverify http ${res.status}` }
    }

    const data = await res.json() as { success: boolean; 'error-codes'?: string[] }
    if (data.success) return { ok: true }

    return { ok: false, motivo: (data['error-codes'] ?? []).join(',') || 'recusado' }
  } catch (err) {
    console.warn('[turnstile] siteverify indisponível — fail-open:', err)
    return { ok: true, motivo: 'siteverify indisponível' }
  } finally {
    clearTimeout(timer)
  }
}
