"""
corrigir_params.py  v2
───────────────────────
Corrige o erro do Next.js 15 onde params precisa ser Promise.
Coloque na raiz do projeto e rode: python corrigir_params.py
"""

import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))

ARQUIVOS = [
    "app/api/cupons/[id]/route.ts",
    "app/api/estoque/[id]/route.ts",
    "app/api/pedidos/[id]/etapa/route.ts",
    "app/api/pedidos/[id]/pagamento/route.ts",
]

# Conteúdo correto para cada arquivo
CONTEUDOS = {

"app/api/cupons/[id]/route.ts": """\
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
""",

"app/api/estoque/[id]/route.ts": """\
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar } from '@/lib/middleware'
import { z } from 'zod'

const patchSchema = z.object({
  qtd:    z.number().int().min(0).optional(),
  valor:  z.number().positive().optional(),
  imagem: z.string().optional(),
})

export async function PATCH(
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
    const body   = await req.json()
    const parsed = patchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { erro: 'Dados inválidos', detalhes: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const produto = await prisma.estoque.update({
      where: { id: idNum },
      data:  parsed.data,
    })

    return NextResponse.json(produto)
  } catch (err) {
    console.error('[PATCH /api/estoque/:id]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

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
    await prisma.estoque.delete({ where: { id: idNum } })
    return NextResponse.json({ sucesso: true })
  } catch (err) {
    console.error('[DELETE /api/estoque/:id]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
""",

"app/api/pedidos/[id]/etapa/route.ts": """\
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar } from '@/lib/middleware'
import { z } from 'zod'

const schema = z.object({
  etapa: z.enum([
    'RESERVADO',
    'CONFIRMADO',
    'EM_PREPARO',
    'SAIU_PARA_ENTREGA',
    'ENTREGUE',
    'CANCELADO',
  ]),
})

export async function PATCH(
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
    const body   = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ erro: 'Etapa inválida' }, { status: 400 })
    }

    const pedido = await prisma.pedido.update({
      where: { id: idNum },
      data:  { etapa: parsed.data.etapa },
    })

    return NextResponse.json(pedido)
  } catch (err) {
    console.error('[PATCH /api/pedidos/:id/etapa]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
""",

"app/api/pedidos/[id]/pagamento/route.ts": """\
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autenticar } from '@/lib/middleware'

export async function PATCH(
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
    const pedido = await prisma.pedido.update({
      where: { id: idNum },
      data:  { pagamento: 'REALIZADO' },
    })

    return NextResponse.json(pedido)
  } catch (err) {
    console.error('[PATCH /api/pedidos/:id/pagamento]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
""",

}


def main():
    print("=" * 52)
    print("  Corrigir params Next.js 15  v2")
    print("=" * 52)
    print()

    for rel, conteudo in CONTEUDOS.items():
        path = os.path.join(ROOT, *rel.split("/"))

        os.makedirs(os.path.dirname(path), exist_ok=True)

        with open(path, "w", encoding="utf-8") as f:
            f.write(conteudo)

        print(f"  ✅  {rel}")

    print()
    print("Todos os arquivos reescritos. Rode agora:")
    print("  npm run build")
    print()


if __name__ == "__main__":
    main()