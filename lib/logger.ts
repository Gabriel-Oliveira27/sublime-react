const isDev = process.env.NODE_ENV !== 'production'

export function logError(context: string, error: unknown, publicMsg?: string): void {
  if (isDev) {
    console.error(`[${context}]`, error)
  } else {
    const msg    = publicMsg ?? 'Erro interno'
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error(`[${context}] ${msg} — ${errMsg}`)
  }
}

export function logWarn(context: string, message: string): void {
  console.warn(`[${context}] ${message}`)
}

/**
 * Log de operação bem-sucedida — só emite em desenvolvimento.
 * Em produção, logs de sucesso aumentam o custo de ingestão em
 * serviços externos (Datadog, Logtail) sem benefício operacional.
 * Se precisar de observabilidade em produção, use Sentry ou similar.
 */
export function logSuccess(
  context: string,
  message: string,
  details?: Record<string, unknown>
): void {
  if (!isDev) return
  if (details && Object.keys(details).length) {
    console.log(`[${context}] ✅ ${message}`, details)
  } else {
    console.log(`[${context}] ✅ ${message}`)
  }
}