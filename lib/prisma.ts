import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neon } from '@neondatabase/serverless'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const url = process.env.DATABASE_URL
  console.log('DATABASE_URL disponível:', !!url, url?.slice(0, 30))
  if (!url) throw new Error('DATABASE_URL não definida no runtime')
  const sql = neon(url)
  const adapter = new PrismaNeon(sql as any)
  return new PrismaClient({ adapter } as any)
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma