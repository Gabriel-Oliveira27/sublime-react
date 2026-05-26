import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/config/public
 * Retorna configurações públicas (sem autenticação):
 *   - whatsapp : número para contato/links
 *   - pix      : chave PIX exibida no checkout
 */
export async function GET() {
  try {
    const configs = await prisma.config.findMany({
      where: { chave: { in: ['WHATSAPP', 'PIX_KEY'] } },
    })
    const map = Object.fromEntries(configs.map(c => [c.chave, c.valor]))
    return NextResponse.json({
      whatsapp: map['WHATSAPP'] ?? '',
      pix:      map['PIX_KEY']  ?? '',
    })
  } catch (err) {
    console.error('[GET /api/config/public]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}