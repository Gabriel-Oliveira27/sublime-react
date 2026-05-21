"""
adicionar_options.py
─────────────────────
Adiciona o handler OPTIONS em todas as rotas da API.
Coloque na raiz do projeto e rode: python adicionar_options.py
"""

import os

ROOT = os.path.dirname(os.path.abspath(__file__))

ROTAS = [
    "app/api/auth/login/route.ts",
    "app/api/estoque/route.ts",
    "app/api/estoque/[id]/route.ts",
    "app/api/pedidos/route.ts",
    "app/api/pedidos/[id]/etapa/route.ts",
    "app/api/pedidos/[id]/pagamento/route.ts",
    "app/api/cupons/route.ts",
    "app/api/cupons/[id]/route.ts",
    "app/api/config/pix/route.ts",
    "app/api/upload/route.ts",
]

OPTIONS_HANDLER = """
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
  })
}
"""

def main():
    print("=" * 52)
    print("  Adicionar OPTIONS handler nas rotas")
    print("=" * 52)
    print()

    for rel in ROTAS:
        path = os.path.join(ROOT, *rel.split("/"))

        if not os.path.exists(path):
            print(f"  ⚠️   Não encontrado: {rel}")
            continue

        with open(path, encoding="utf-8") as f:
            conteudo = f.read()

        if "export async function OPTIONS" in conteudo:
            print(f"  ⏭️   Já tem OPTIONS: {rel}")
            continue

        with open(path, "a", encoding="utf-8") as f:
            f.write(OPTIONS_HANDLER)

        print(f"  ✅  OPTIONS adicionado: {rel}")

    print()
    print("Pronto! Rode agora:")
    print("  git add .")
    print('  git commit -m "fix: cors options handler"')
    print("  git push origin main")
    print()

if __name__ == "__main__":
    main()