"""
organizar_api.py
────────────────
Coloca cada arquivo baixado no lugar certo do projeto.

USO:
  1. Crie uma pasta (ex: C:/downloads/api-files) e coloque todos
     os arquivos baixados lá dentro.
  2. Edite as duas variáveis abaixo (PASTA_ARQUIVOS e PASTA_PROJETO).
  3. Rode:  python organizar_api.py
"""

import os
import shutil

# ─────────────────────────────────────────────────────────────
# ⚙️  CONFIGURE AQUI
# ─────────────────────────────────────────────────────────────

# Pasta onde você colocou todos os arquivos baixados
PASTA_ARQUIVOS = r"E:\dev\arch"

# Raiz do seu projeto Next.js (onde fica o package.json)
PASTA_PROJETO  = r"E:\dev\sublime"

# ─────────────────────────────────────────────────────────────
# MAPA: nome do arquivo baixado → caminho destino no projeto
# ─────────────────────────────────────────────────────────────

MAPA = {
    # Lib utilitários
    "jwt.ts":               "lib/jwt.ts",
    "middleware.ts":        "lib/middleware.ts",

    # Seed de usuários
    "seed-usuarios.ts":     "prisma/seed-usuarios.ts",

    # Rotas de autenticação
    "auth.login.route.ts":  "app/api/auth/login/route.ts",

    # Rotas de estoque
    "estoque.route.ts":     "app/api/estoque/route.ts",
    "estoque.id.route.ts":  "app/api/estoque/[id]/route.ts",

    # Rotas de pedidos
    "pedidos.route.ts":                  "app/api/pedidos/route.ts",
    "pedidos.id.etapa.route.ts":         "app/api/pedidos/[id]/etapa/route.ts",
    "pedidos.id.pagamento.route.ts":     "app/api/pedidos/[id]/pagamento/route.ts",

    # Rotas de cupons
    "cupons.route.ts":      "app/api/cupons/route.ts",
    "cupons.id.route.ts":   "app/api/cupons/[id]/route.ts",

    # Rota de config PIX
    "config.pix.route.ts":  "app/api/config/pix/route.ts",

    # Guia de instalação (vai para docs/)
    "GUIA_INSTALACAO_API.md": "docs/GUIA_INSTALACAO_API.md",
}

# ─────────────────────────────────────────────────────────────
# SCHEMA — caso especial: adiciona ao schema.prisma existente
# ─────────────────────────────────────────────────────────────

SCHEMA_EXTRA     = "ADICIONAR_AO_SCHEMA.prisma"
SCHEMA_DESTINO   = "prisma/schema.prisma"
SCHEMA_MARCADOR  = "// ── USUARIO E CONFIG (adicionado pelo organizar_api.py) ──"

# ─────────────────────────────────────────────────────────────
# SCRIPT
# ─────────────────────────────────────────────────────────────

def caminho(relativo: str) -> str:
    return os.path.join(PASTA_PROJETO, relativo.replace("/", os.sep))

def mover_arquivo(origem: str, destino: str) -> None:
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    shutil.copy2(origem, destino)
    print(f"  ✅  {os.path.basename(origem)}")
    print(f"       → {destino.replace(PASTA_PROJETO, '').lstrip(os.sep)}\n")

def adicionar_ao_schema(arquivo_extra: str, schema_destino: str) -> None:
    if not os.path.exists(schema_destino):
        print(f"  ⚠️  schema.prisma não encontrado em: {schema_destino}")
        print(f"       Crie o schema primeiro e rode o script novamente.\n")
        return

    with open(schema_destino, "r", encoding="utf-8") as f:
        conteudo_atual = f.read()

    if SCHEMA_MARCADOR in conteudo_atual:
        print(f"  ⏭️   ADICIONAR_AO_SCHEMA.prisma — já foi adicionado antes, pulando.\n")
        return

    with open(arquivo_extra, "r", encoding="utf-8") as f:
        conteudo_extra = f.read()

    with open(schema_destino, "a", encoding="utf-8") as f:
        f.write(f"\n\n{SCHEMA_MARCADOR}\n")
        f.write(conteudo_extra)

    print(f"  ✅  ADICIONAR_AO_SCHEMA.prisma")
    print(f"       → colado no final de prisma/schema.prisma\n")

def main():
    print("=" * 55)
    print("  Organizador de arquivos da API — Sublime")
    print("=" * 55)
    print()

    # Verifica pastas
    if not os.path.isdir(PASTA_ARQUIVOS):
        print(f"❌  Pasta de arquivos não encontrada:\n    {PASTA_ARQUIVOS}")
        print("\n    Edite a variável PASTA_ARQUIVOS no script.")
        return

    if not os.path.isdir(PASTA_PROJETO):
        print(f"❌  Pasta do projeto não encontrada:\n    {PASTA_PROJETO}")
        print("\n    Edite a variável PASTA_PROJETO no script.")
        return

    print(f"📂  Arquivos em:  {PASTA_ARQUIVOS}")
    print(f"🏠  Projeto em:   {PASTA_PROJETO}")
    print()

    nao_encontrados = []

    # Move os arquivos do mapa
    for nome_arquivo, destino_relativo in MAPA.items():
        origem  = os.path.join(PASTA_ARQUIVOS, nome_arquivo)
        destino = caminho(destino_relativo)

        if os.path.exists(origem):
            mover_arquivo(origem, destino)
        else:
            nao_encontrados.append(nome_arquivo)

    # Caso especial: schema
    schema_extra = os.path.join(PASTA_ARQUIVOS, SCHEMA_EXTRA)
    schema_dest  = caminho(SCHEMA_DESTINO)

    if os.path.exists(schema_extra):
        adicionar_ao_schema(schema_extra, schema_dest)
    else:
        nao_encontrados.append(SCHEMA_EXTRA)

    # Relatório final
    print("=" * 55)

    if nao_encontrados:
        print("\n⚠️   Arquivos não encontrados na pasta de origem:")
        for f in nao_encontrados:
            print(f"     - {f}")
        print("\n    Verifique os nomes e rode o script novamente.\n")
    else:
        print("\n🎉  Tudo organizado com sucesso!\n")
        print("Próximos passos:")
        print("  1. npm install bcryptjs jose zod")
        print("  2. npm install -D @types/bcryptjs")
        print("  3. npx prisma migrate dev --name add_usuario_config")
        print("  4. Gere o JWT_SECRET: openssl rand -base64 32")
        print("  5. Adicione JWT_SECRET ao .env e ao Vercel")
        print("  6. npx tsx prisma/seed-usuarios.ts")
        print("  7. Faça o deploy: vercel --prod\n")

if __name__ == "__main__":
    main()
