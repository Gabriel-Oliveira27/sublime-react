// Normaliza a coluna `litros` do estoque: corrige typos de digitação com
// ponto-e-vírgula ("0;350L" → "0.350L") e espaços sobrando. Sem isso, o
// filtro de capacidade da loja (igualdade exata) mostra o mesmo volume como
// duas opções diferentes no select.
//
// Uso:
//   npx tsx scripts/normaliza-litros.ts           (dry-run: só lista o que mudaria)
//   npx tsx scripts/normaliza-litros.ts --apply   (aplica as correções)
import 'dotenv/config'
import { prisma } from '../lib/prisma'

function normaliza(litros: string): string {
  return litros.replace(/;/g, '.').trim()
}

async function main() {
  const apply = process.argv.includes('--apply')

  const todos    = await prisma.estoque.findMany({ select: { id: true, produto: true, litros: true } })
  const corrigir = todos.filter(p => p.litros && normaliza(p.litros) !== p.litros)

  if (!corrigir.length) {
    console.log('Nada a corrigir — todas as capacidades já estão normalizadas.')
    return
  }

  console.log(`${corrigir.length} registro(s) com capacidade fora do padrão:\n`)
  for (const p of corrigir) {
    console.log(`  #${p.id} ${p.produto}: "${p.litros}" → "${normaliza(p.litros)}"`)
  }

  if (!apply) {
    console.log('\nDry-run: nada foi alterado. Rode com --apply para corrigir.')
    return
  }

  for (const p of corrigir) {
    await prisma.estoque.update({
      where: { id: p.id },
      data:  { litros: normaliza(p.litros) },
    })
  }
  console.log(`\n✓ ${corrigir.length} registro(s) corrigido(s).`)
}

main()
  .catch(e => { console.error('Erro:', e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
