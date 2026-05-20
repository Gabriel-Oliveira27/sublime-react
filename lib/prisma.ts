import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neon } from '@neondatabase/serverless'

const createPrisma = () => {
  const sql = neon(process.env.DATABASE_URL!)
  const adapter = new PrismaNeon(sql as any)
  return new PrismaClient({ adapter } as any)
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma ?? createPrisma()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma