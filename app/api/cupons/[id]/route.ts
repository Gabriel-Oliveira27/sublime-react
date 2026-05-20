import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar } from '@/lib/middleware'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  const id = parseInt(params.id)
  if (isNaN(id)) {
    return NextResponse.json({ erro: 'ID inválido' }, { status: 400 })
  }

  try {
    await prisma.cupom.delete({ where: { id } })
    return NextResponse.json({ sucesso: true })
  } catch (err) {
    console.error('[DELETE /api/cupons/:id]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
