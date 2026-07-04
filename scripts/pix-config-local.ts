// Liga o PIX online no banco para TESTE LOCAL, com uma taxa de exemplo.
// Uso:  npx tsx scripts/pix-config-local.ts
//
// Depois disso, no checkout (método PIX) aparece a escolha
// "Pagar agora (instantâneo)" × "Pagar na retirada/entrega".
// Sem MP_ACCESS_TOKEN, roda no modo MOCK (gera um QR de teste e mostra o botão
// "Simular pagamento").
import { prisma } from '../lib/prisma'

async function main() {
  const pares: [string, string][] = [
    ['PIX_ONLINE_ATIVO', 'true'],
    ['PIX_TAXA_MODO',    'FIXA'],
    ['PIX_TAXA_FIXA',    JSON.stringify({ tipo: 'PERCENT', valor: 1.99 })],
    ['PIX_TAXA_FAIXAS',  JSON.stringify([
      { min: 0,   tipo: 'PERCENT', valor: 1.99 },
      { min: 200, tipo: 'PERCENT', valor: 0.99 },
    ])],
  ]

  for (const [chave, valor] of pares) {
    await prisma.config.upsert({ where: { chave }, update: { valor }, create: { chave, valor } })
    console.log(`✓ ${chave} = ${valor}`)
  }

  console.log('\nPIX online LIGADO (modo FIXA 1,99%). Troque PIX_TAXA_MODO para')
  console.log('NULA (sem taxa) ou FAIXAS (por valor de compra) para testar os outros modos.')
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
