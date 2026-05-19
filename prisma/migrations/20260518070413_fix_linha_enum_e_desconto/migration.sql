-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Linha" ADD VALUE 'CONSERVAR';
ALTER TYPE "Linha" ADD VALUE 'PREPARAR';
ALTER TYPE "Linha" ADD VALUE 'SERVIR';

-- AlterTable
ALTER TABLE "Cupom" ALTER COLUMN "desconto" SET DATA TYPE TEXT;
