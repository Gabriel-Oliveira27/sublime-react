import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();


function readCsv(filename: string): Record<string, string>[] {
  const filePath = path.join(__dirname, "seed-data", filename);
  const content = fs.readFileSync(filePath, "utf-8");
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

// Mapeia o texto da planilha para o enum correto
function mapLinha(valor: string): string {
  const mapa: Record<string, string> = {
    freezer:   "FREEZER",
    aquecer:   "AQUECER",
    conservar: "CONSERVAR",
    preparar:  "PREPARAR",
    servir:    "SERVIR",
    armazenar: "ARMAZENAR",
  };
  return mapa[valor?.toLowerCase()?.trim()] ?? "ARMAZENAR";
}

function mapMetodoPagamento(valor: string): string {
  const mapa: Record<string, string> = {
    dinheiro:  "DINHEIRO",
    pix:       "PIX",
    selecione: "PIX", // valor padrão para registros antigos incompletos
  };
  // Crédito parcelado: "Crédito 1x", "Crédito 12x", etc.
  if (valor?.toLowerCase().includes("crédito") || valor?.toLowerCase().includes("credito")) {
    return "CREDITO";
  }
  return mapa[valor?.toLowerCase()?.trim()] ?? "PIX";
}

function mapPagamento(valor: string): string {
  const mapa: Record<string, string> = {
    pendente:   "PENDENTE",
    realizado:  "REALIZADO",
    confirmado: "REALIZADO", // "Confirmado" na planilha = pago
  };
  return mapa[valor?.toLowerCase()?.trim()] ?? "PENDENTE";
}

function mapEtapa(valor: string): string {
  const mapa: Record<string, string> = {
    reservado:          "RESERVADO",
    confirmado:         "CONFIRMADO",
    "em preparo":       "EM_PREPARO",
    "em_preparo":       "EM_PREPARO",
    "saiu para entrega":"SAIU_PARA_ENTREGA",
    entregue:           "ENTREGUE",
    cancelado:          "CANCELADO",
  };
  return mapa[valor?.toLowerCase()?.trim()] ?? "RESERVADO";
}

function parseDecimal(valor: string | undefined): number {
  if (!valor || valor.trim() === "") return 0;
  return parseFloat(valor.replace(",", ".")) || 0;
}

// ─────────────────────────────────────────────
// SEEDS
// ─────────────────────────────────────────────

async function seedEstoque() {
  const rows = readCsv("estoque.csv");
  let importados = 0;
  let pulados = 0;

  for (const row of rows) {
    // Pula linhas sem produto
    if (!row["Produto"]?.trim()) { pulados++; continue; }

    await prisma.estoque.create({
      data: {
        qtd:     parseInt(row["Qtd"]) || 0,
        produto: row["Produto"],
        cores:   row["Cores"] ?? "",
        litros:  row["Litros"] ?? "",
        valor:   parseDecimal(row["Valor"]),
        linha:   mapLinha(row["Linha"]) as any,
        imagem:  row["Imagem"] ?? "",
        filtros: row["Filtros"] ?? "",
      },
    });
    importados++;
  }

  console.log(`✅ Estoque: ${importados} produtos importados, ${pulados} pulados`);
}

async function seedCupons() {
  const rows = readCsv("cupons.csv");

  for (const row of rows) {
    if (!row["Cupom"]?.trim()) continue;

    await prisma.cupom.create({
      data: {
        cupom:          row["Cupom"].trim().toUpperCase(),
        desconto:       String(row["Desconto"] ?? "0"),
        quantidadeUsos: parseInt(row["Quantidade de usos"]) || 0,
      },
    });
  }

  console.log(`✅ Cupons: ${rows.length} cupons importados`);
}

async function seedPedidos() {
  const rows = readCsv("pedidos.csv");
  let importados = 0;
  let pulados = 0;

  for (const row of rows) {
    if (!row["Id rastreio"]?.trim()) { pulados++; continue; }

    // Parcelas: tenta converter, se não tiver valor usa 1
    const parcelas = parseInt(row["Parcelas"]) || 1;

    // Troco e valor a levar são opcionais
    const trocoPara   = row["Troco para"] ? parseDecimal(row["Troco para"]) : null;
    const valorALevar = row["Valor a levar"] ? parseDecimal(row["Valor a levar"]) : null;

    // Frete: null na planilha = 0
    const frete = row["Frete"] ? parseDecimal(row["Frete"]) : 0;

    // Data: tenta parsear, usa now() como fallback
    let dataCompra = new Date();
    if (row["Data de compra"]?.trim()) {
      const tentativa = new Date(row["Data de compra"]);
      if (!isNaN(tentativa.getTime())) dataCompra = tentativa;
    }

    await prisma.pedido.create({
      data: {
        idRastreio:      row["Id rastreio"].trim(),
        nome:            row["Nome"] ?? "",
        contato:         row["Contato"] ?? "",
        pedido:          { descricao: row["Pedido"] ?? "" },
        endereco:        row["Endereço"] ?? "",
        totalVenda:      parseDecimal(String(row["Total da venda"])),
        metodoPagamento: mapMetodoPagamento(row["Método de pagamento"]) as any,
        pagamento:       mapPagamento(row["Pagamento"]) as any,
        etapa:           mapEtapa(row["Etapa"]) as any,
        cupom:           row["Cupom"]?.trim() || null,
        frete,
        dataCompra,
        parcelas,
        trocoPara,
        valorALevar,
      },
    });
    importados++;
  }

  console.log(`✅ Pedidos: ${importados} importados, ${pulados} pulados`);
}

async function seedClientes() {
  const rows = readCsv("clientes.csv");

  if (rows.length === 0) {
    console.log("⏭️  Clientes: arquivo vazio, nada a importar");
    return;
  }

  for (const row of rows) {
    if (!row["CPF"]?.trim()) continue;

    const compras = row["Compra(s)"]
      ? row["Compra(s)"].split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    await prisma.cliente.create({
      data: {
        nome:    row["Nome"] ?? "",
        cpf:     row["CPF"].trim(),
        compras: compras,
        contato: row["Contato"] ?? "",
      },
    });
  }

  console.log(`✅ Clientes: ${rows.length} clientes importados`);
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  console.log("🚀 Iniciando seed...\n");

  await seedEstoque();
  await seedCupons();
  await seedPedidos();
  await seedClientes();

  console.log("\n🎉 Seed concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });