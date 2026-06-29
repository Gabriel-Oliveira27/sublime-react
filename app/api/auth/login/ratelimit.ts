// app/api/auth/login/ratelimit.ts
//
// Rate limiting simples para o endpoint de login.
// Usa um Map em memória — funciona em desenvolvimento e em instâncias
// de longa duração. Na Vercel (serverless) cada instância tem seu próprio
// estado, então o limite é por instância, não global.
//
// Para proteção global em produção, substitua por Upstash:
//   npm install @upstash/ratelimit @upstash/redis
//   https://upstash.com/docs/ratelimit/quickstart
//
// Limite: 10 tentativas por IP a cada 15 minutos.

const WINDOW_MS  = 15 * 60 * 1000;  // 15 minutos
const MAX_HITS   = 10;

interface Entry { count: number; resetAt: number; }
const store = new Map<string, Entry>();

// Limpeza periódica para evitar vazamento de memória
setInterval(() => {
  const now = Date.now();
  store.forEach((v, k) => { if (v.resetAt < now) store.delete(k); });
}, 60_000);

export function checkRateLimit(
  ip: string,
  ns = 'login'
): { allowed: boolean; retryAfterSec: number } {
  // Namespace separa baldes (ex: login vs pedidos) para que um não consuma
  // a cota do outro.
  const key  = `${ns}:${ip}`;
  const now  = Date.now();
  let entry  = store.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 1, resetAt: now + WINDOW_MS };
    store.set(key, entry);
    return { allowed: true, retryAfterSec: 0 };
  }

  entry.count++;
  if (entry.count > MAX_HITS) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSec };
  }

  return { allowed: true, retryAfterSec: 0 };
}