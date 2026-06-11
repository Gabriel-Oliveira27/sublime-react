import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/health
 *
 * Endpoint de verificação de saúde do serviço.
 * Útil para monitoramento externo (UptimeRobot, BetterStack, etc.)
 * e para confirmar que o banco está respondendo após um deploy.
 *
 * Resposta 200 → tudo ok
 * Resposta 503 → banco inacessível
 */
export async function GET() {
  const start = Date.now()

  try {
    // Query mínima — só confirma que o Prisma consegue falar com o Neon
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json({
      status:   'ok',
      db:       'ok',
      latencyMs: Date.now() - start,
      env:      process.env.NODE_ENV,
      ts:       new Date().toISOString(),
    })
  } catch (err) {
    console.error('[GET /api/health] db unreachable:', err)
    return NextResponse.json(
      {
        status:   'error',
        db:       'unreachable',
        latencyMs: Date.now() - start,
        ts:       new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}