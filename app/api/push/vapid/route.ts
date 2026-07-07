import { NextResponse } from 'next/server'
import { CORS_HEADERS, corsOptions } from '@/lib/cors'

// GET /api/push/vapid → chave pública VAPID para o navegador assinar o push.
// Pública por definição (vai dentro do PushManager.subscribe de qualquer
// visitante); CORS liberado para o dashboard usar cross-origin.
export function GET() {
  const key = process.env.VAPID_PUBLIC_KEY ?? ''
  return NextResponse.json({ key, ativo: !!key }, { headers: CORS_HEADERS })
}

export function OPTIONS() { return corsOptions() }
