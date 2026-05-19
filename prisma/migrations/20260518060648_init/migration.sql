-- CreateEnum
CREATE TYPE "Linha" AS ENUM ('FREEZER', 'AQUECER', 'ARMAZENAR');

-- CreateEnum
CREATE TYPE "MetodoPagamento" AS ENUM ('DINHEIRO', 'PIX', 'CREDITO');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'REALIZADO');

-- CreateEnum
CREATE TYPE "EtapaPedido" AS ENUM ('RESERVADO', 'CONFIRMADO', 'EM_PREPARO', 'SAIU_PARA_ENTREGA', 'ENTREGUE', 'CANCELADO');

-- CreateTable
CREATE TABLE "Estoque" (
    "id" SERIAL NOT NULL,
    "qtd" INTEGER NOT NULL,
    "produto" TEXT NOT NULL,
    "cores" TEXT NOT NULL,
    "litros" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "linha" "Linha" NOT NULL,
    "imagem" TEXT NOT NULL,
    "filtros" TEXT NOT NULL,

    CONSTRAINT "Estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cupom" (
    "id" SERIAL NOT NULL,
    "cupom" TEXT NOT NULL,
    "desconto" DECIMAL(5,2) NOT NULL,
    "quantidadeUsos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Cupom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" SERIAL NOT NULL,
    "idRastreio" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "contato" TEXT NOT NULL,
    "pedido" JSONB NOT NULL,
    "endereco" TEXT NOT NULL,
    "totalVenda" DECIMAL(10,2) NOT NULL,
    "metodoPagamento" "MetodoPagamento" NOT NULL,
    "pagamento" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "etapa" "EtapaPedido" NOT NULL DEFAULT 'RESERVADO',
    "cupom" TEXT,
    "frete" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dataCompra" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parcelas" INTEGER NOT NULL DEFAULT 1,
    "trocoPara" DECIMAL(10,2),
    "valorALevar" DECIMAL(10,2),

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "compras" TEXT[],
    "contato" TEXT NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cupom_cupom_key" ON "Cupom"("cupom");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_idRastreio_key" ON "Pedido"("idRastreio");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_cpf_key" ON "Cliente"("cpf");
