import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neon } from '@neondatabase/serverless'

const createPrisma = () => {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL não definida')
  const sql = neon(url)
  const adapter = new PrismaNeon(sql as any)
  return new PrismaClient({ adapter } as any)
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma ?? createPrisma()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma