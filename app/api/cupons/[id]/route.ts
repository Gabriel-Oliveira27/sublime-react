import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar } from '@/lib/middleware'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const idNum = parseInt(id)
  if (isNaN(idNum)) {
    return NextResponse.json({ erro: 'ID inválido' }, { status: 400 })
  }

  try {
    await prisma.cupom.delete({ where: { id: idNum } })
    return NextResponse.json({ sucesso: true })
  } catch (err) {
    console.error('[DELETE /api/cupons/:id]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
