"""
verificar_projeto.py
─────────────────────
Roda na raiz do projeto e verifica se tudo está certo
antes do deploy no Vercel.

USO:
  1. Coloque este arquivo na raiz do projeto (junto do package.json)
  2. Rode: python verificar_projeto.py
"""

import os
import json
import re

# ─────────────────────────────────────────────────────────────
# Raiz do projeto (pasta onde este script está)
# ─────────────────────────────────────────────────────────────
ROOT = os.path.dirname(os.path.abspath(__file__))

erros   = []
avisos  = []
ok_list = []

def erro(msg):   erros.append(f"  ❌  {msg}")
def aviso(msg):  avisos.append(f"  ⚠️   {msg}")
def ok(msg):     ok_list.append(f"  ✅  {msg}")

def caminho(*partes):
    return os.path.join(ROOT, *partes)

def existe(relativo, label=None):
    label = label or relativo
    if os.path.exists(caminho(*relativo.split("/"))):
        ok(label)
        return True
    else:
        erro(f"Arquivo não encontrado: {relativo}")
        return False

def contem(relativo, texto, label):
    path = caminho(*relativo.split("/"))
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8", errors="ignore") as f:
        conteudo = f.read()
    if texto in conteudo:
        ok(label)
    else:
        erro(label)

def nao_contem(relativo, texto, label):
    path = caminho(*relativo.split("/"))
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8", errors="ignore") as f:
        conteudo = f.read()
    if texto not in conteudo:
        ok(label)
    else:
        aviso(label)

# ─────────────────────────────────────────────────────────────
print("=" * 58)
print("  Verificador do Projeto — Sublime API")
print("=" * 58)
print(f"\n📂  Projeto: {ROOT}\n")

# ─────────────────────────────────────────────────────────────
print("── 1. Estrutura de arquivos essenciais ──────────────────")

arquivos_essenciais = [
    ("package.json",                        "package.json"),
    ("prisma/schema.prisma",               "prisma/schema.prisma"),
    ("prisma.config.ts",                   "prisma.config.ts"),
    ("lib/prisma.ts",                      "lib/prisma.ts"),
    ("lib/jwt.ts",                         "lib/jwt.ts"),
    ("lib/middleware.ts",                  "lib/middleware.ts"),
    ("lib/cloudinary.ts",                  "lib/cloudinary.ts"),
    ("next.config.js",                     "next.config.js"),
    ("app/api/auth/login/route.ts",        "app/api/auth/login/route.ts"),
    ("app/api/estoque/route.ts",           "app/api/estoque/route.ts"),
    ("app/api/estoque/[id]/route.ts",      "app/api/estoque/[id]/route.ts"),
    ("app/api/pedidos/route.ts",           "app/api/pedidos/route.ts"),
    ("app/api/pedidos/[id]/etapa/route.ts","app/api/pedidos/[id]/etapa/route.ts"),
    ("app/api/pedidos/[id]/pagamento/route.ts","app/api/pedidos/[id]/pagamento/route.ts"),
    ("app/api/cupons/route.ts",            "app/api/cupons/route.ts"),
    ("app/api/cupons/[id]/route.ts",       "app/api/cupons/[id]/route.ts"),
    ("app/api/config/pix/route.ts",        "app/api/config/pix/route.ts"),
    ("app/api/upload/route.ts",            "app/api/upload/route.ts"),
    ("prisma/seed-usuarios.ts",            "prisma/seed-usuarios.ts"),
]

for rel, label in arquivos_essenciais:
    existe(rel, label)

# ─────────────────────────────────────────────────────────────
print("\n── 2. Variáveis de ambiente (.env) ──────────────────────")

env_path = caminho(".env")
if os.path.exists(env_path):
    with open(env_path, encoding="utf-8", errors="ignore") as f:
        env_conteudo = f.read()

    variaveis = {
        "DATABASE_URL":          "DATABASE_URL definida",
        "JWT_SECRET":            "JWT_SECRET definida",
        "CLOUDINARY_CLOUD_NAME": "CLOUDINARY_CLOUD_NAME definida",
        "CLOUDINARY_API_KEY":    "CLOUDINARY_API_KEY definida",
        "CLOUDINARY_API_SECRET": "CLOUDINARY_API_SECRET definida",
    }

    for var, label in variaveis.items():
        linha = [l for l in env_conteudo.splitlines() if l.startswith(var + "=")]
        if linha:
            valor = linha[0].split("=", 1)[1].strip().strip('"')
            if valor and valor not in ("", "sua-api.vercel.app", "cole-aqui"):
                ok(label)
            else:
                erro(f"{var} está vazia ou com valor placeholder")
        else:
            aviso(f"{var} não encontrada no .env (obrigatória no Vercel)")

    if "NODE_ENV" in env_conteudo:
        aviso("NODE_ENV definida no .env — remova, o Vercel define isso sozinho")
    else:
        ok("NODE_ENV não está no .env")

    # Verifica sslmode no DATABASE_URL
    db_linha = [l for l in env_conteudo.splitlines() if l.startswith("DATABASE_URL=")]
    if db_linha:
        if "sslmode=require" in db_linha[0]:
            ok("DATABASE_URL contém sslmode=require")
        else:
            erro("DATABASE_URL sem ?sslmode=require — necessário para o Neon")
else:
    erro(".env não encontrado na raiz do projeto")

# ─────────────────────────────────────────────────────────────
print("\n── 3. package.json ──────────────────────────────────────")

pkg_path = caminho("package.json")
if os.path.exists(pkg_path):
    with open(pkg_path, encoding="utf-8") as f:
        try:
            pkg = json.load(f)
        except json.JSONDecodeError:
            erro("package.json com JSON inválido")
            pkg = {}

    deps     = pkg.get("dependencies", {})
    dev_deps = pkg.get("devDependencies", {})
    todos    = {**deps, **dev_deps}

    pacotes = {
        "bcryptjs":       "bcryptjs instalado",
        "jose":           "jose instalado",
        "zod":            "zod instalado",
        "@prisma/client": "@prisma/client instalado",
        "prisma":         "prisma instalado",
        "csv-parse":      "csv-parse instalado",
    }

    for pkg_nome, label in pacotes.items():
        if pkg_nome in todos:
            ok(label)
        else:
            erro(f"Pacote não encontrado: {pkg_nome} — rode npm install {pkg_nome}")

    if "@types/bcryptjs" in todos:
        ok("@types/bcryptjs instalado")
    else:
        aviso("@types/bcryptjs não encontrado — rode: npm install -D @types/bcryptjs")

# ─────────────────────────────────────────────────────────────
print("\n── 4. Schema do Prisma ──────────────────────────────────")

schema_path = caminho("prisma", "schema.prisma")
if os.path.exists(schema_path):
    with open(schema_path, encoding="utf-8") as f:
        schema = f.read()

    models = ["Estoque", "Cupom", "Pedido", "Cliente", "Usuario", "Config"]
    for model in models:
        if f"model {model}" in schema:
            ok(f"model {model} presente")
        else:
            erro(f"model {model} não encontrado no schema.prisma")

    if 'url      = env("DATABASE_URL")' in schema:
        erro("schema.prisma contém 'url = env(...)' — remova, no Prisma 7 a URL vai no prisma.config.ts")
    else:
        ok("schema.prisma sem url no datasource (correto para Prisma 7)")

# ─────────────────────────────────────────────────────────────
print("\n── 5. next.config.js ────────────────────────────────────")

contem("next.config.js", "Access-Control-Allow-Origin",
       "next.config.js tem configuração de CORS")
contem("next.config.js", "gabriel-oliveira27.github.io",
       "CORS libera o domínio do GitHub Pages")

# ─────────────────────────────────────────────────────────────
print("\n── 6. Conteúdo das rotas ────────────────────────────────")

rotas = {
    "app/api/auth/login/route.ts":           ["bcryptjs", "signJwt", "usuario"],
    "app/api/estoque/route.ts":              ["autenticar", "prisma.estoque"],
    "app/api/estoque/[id]/route.ts":         ["autenticar", "PATCH", "DELETE"],
    "app/api/pedidos/route.ts":              ["autenticar", "prisma.pedido"],
    "app/api/pedidos/[id]/etapa/route.ts":   ["autenticar", "etapa"],
    "app/api/pedidos/[id]/pagamento/route.ts":["autenticar", "REALIZADO"],
    "app/api/cupons/route.ts":               ["autenticar", "prisma.cupom"],
    "app/api/cupons/[id]/route.ts":          ["autenticar", "DELETE"],
    "app/api/config/pix/route.ts":           ["autenticar", "PIX_KEY"],
}

for rota, termos in rotas.items():
    path = caminho(*rota.split("/"))
    if not os.path.exists(path):
        continue
    with open(path, encoding="utf-8", errors="ignore") as f:
        conteudo = f.read()
    faltando = [t for t in termos if t not in conteudo]
    if not faltando:
        ok(f"{rota.split('/')[-2]}/{rota.split('/')[-1]} — ok")
    else:
        erro(f"{rota} — termos ausentes: {', '.join(faltando)}")

# ─────────────────────────────────────────────────────────────
print("\n── 7. .gitignore ────────────────────────────────────────")

gitignore_path = caminho(".gitignore")
if os.path.exists(gitignore_path):
    with open(gitignore_path, encoding="utf-8") as f:
        gi = f.read()

    checks = {
        ".env":                 ".env ignorado",
        "node_modules":        "node_modules ignorado",
        "prisma/seed-data":    "prisma/seed-data ignorado (dados reais)",
        ".next":               ".next ignorado",
    }

    for termo, label in checks.items():
        if termo in gi:
            ok(label)
        else:
            aviso(f".gitignore não ignora '{termo}'")
else:
    aviso(".gitignore não encontrado")

# ─────────────────────────────────────────────────────────────
print("\n── 8. node_modules ──────────────────────────────────────")

nm_path = caminho("node_modules")
if os.path.isdir(nm_path):
    ok("node_modules existe (npm install já foi rodado)")
else:
    erro("node_modules não existe — rode: npm install")

prisma_client = caminho("node_modules", "@prisma", "client")
if os.path.isdir(prisma_client):
    ok("@prisma/client gerado em node_modules")
else:
    erro("@prisma/client não gerado — rode: npx prisma generate")

# ─────────────────────────────────────────────────────────────
# RELATÓRIO FINAL
# ─────────────────────────────────────────────────────────────
print("\n" + "=" * 58)
print("  RESULTADO")
print("=" * 58)

total_ok    = len(ok_list)
total_erros = len(erros)
total_aviso = len(avisos)

if erros:
    print(f"\n❌  {total_erros} erro(s) encontrado(s):\n")
    for e in erros:
        print(e)

if avisos:
    print(f"\n⚠️   {total_aviso} aviso(s):\n")
    for a in avisos:
        print(a)

if ok_list:
    print(f"\n✅  {total_ok} verificação(ões) passaram")

print()
if not erros:
    print("🚀  Projeto pronto para deploy!\n")
    print("  Próximo passo:")
    print("  git add . && git commit -m 'feat: api pronta' && git push\n")
else:
    print("🔧  Corrija os erros acima antes de fazer o deploy.\n")
