import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const url = process.env.DATABASE_URL!
  // Ambiente de testes local (ver AMBIENTE-TESTE.md): Postgres comum via TCP.
  // O adapter da Neon fala WebSocket com a nuvem e não conecta em localhost.
  if (/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })
  }
  const adapter = new PrismaNeon({ connectionString: url })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
