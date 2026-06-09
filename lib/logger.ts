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