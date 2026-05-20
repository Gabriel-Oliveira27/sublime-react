import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('👤 Criando usuários...\n')

  const usuarios = [
    {
      nome:    'Gabriel de Oliveira Bezerra',
      apelido: 'Gabriel',
      email:   'gabriel@sublime.com',
      senha:   'troque-essa-senha-gabriel',
    },
    {
      nome:    'Delma Pereira de Oliveira',
      apelido: 'Delma',
      email:   'delma@sublime.com',
      senha:   'troque-essa-senha-delma',
    },
  ]

  for (const u of usuarios) {
    const hash = await bcrypt.hash(u.senha, 12)

    await prisma.usuario.upsert({
      where:  { email: u.email },
      update: {},
      create: {
        nome:    u.nome,
        apelido: u.apelido,
        email:   u.email,
        senha:   hash,
        ativo:   true,
      },
    })

    console.log(`✅ ${u.apelido} criado — email: ${u.email}`)
    console.log(`   Senha inicial: ${u.senha}`)
    console.log(`   ⚠️  Troque a senha após o primeiro login!\n`)
  }

  // Cria config PIX vazia se não existir
  await prisma.config.upsert({
    where:  { chave: 'PIX_KEY' },
    update: {},
    create: { chave: 'PIX_KEY', valor: '' },
  })

  console.log('✅ Config PIX inicializada')
  console.log('\n🎉 Seed de usuários concluído!')
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
