"""
verificar_imagens.py
─────────────────────
Verifica o estado das imagens no banco via API.
Mostra o que está como URL, o que é nome de arquivo, o que é pendente.

USO:
  1. Coloque na raiz do projeto (junto do .env)
  2. Rode: python verificar_imagens.py
"""

import os
import re
import requests

API_BASE    = "https://sublime-react.vercel.app"
EMAIL       = "gabriel@sublime.com"
SENHA       = "gabriel*27"

def ler_env():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    valores = {}
    with open(env_path, encoding='utf-8') as f:
        for linha in f:
            linha = linha.strip()
            if '=' in linha and not linha.startswith('#'):
                chave, valor = linha.split('=', 1)
                valores[chave.strip()] = valor.strip().strip('"').strip("'")
    return valores

def main():
    print("=" * 60)
    print("  Verificar estado das imagens no banco")
    print("=" * 60)
    print()

    # Login
    print("🔐 Fazendo login...")
    res = requests.post(
        f"{API_BASE}/api/auth/login",
        json={"email": EMAIL, "senha": SENHA},
        timeout=15,
    )
    if res.status_code != 200:
        print(f"❌ Login falhou: {res.status_code} — {res.text}")
        return
    token = res.json().get("token")
    print("✅ Login ok\n")

    # Busca estoque
    res = requests.get(
        f"{API_BASE}/api/estoque",
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    produtos = res.json()
    print(f"📦 {len(produtos)} produtos no banco\n")

    urls        = []
    arquivos    = []
    pendentes   = []
    vazios      = []

    for p in produtos:
        img = str(p.get('imagem') or '').strip()
        nome = p.get('produto') or ''
        pid  = p.get('id')

        if not img or img in ('None', 'null', 'undefined', ''):
            vazios.append((pid, nome, img))
        elif img.startswith('http://') or img.startswith('https://'):
            urls.append((pid, nome, img))
        elif img.lower() in ('pendente', 'ok', '-'):
            pendentes.append((pid, nome, img))
        else:
            arquivos.append((pid, nome, img))

    # Relatório
    print(f"✅  URLs Cloudinary:     {len(urls)}")
    print(f"⚠️   Nomes de arquivo:   {len(arquivos)}")
    print(f"⏭️   Pendente/OK:        {len(pendentes)}")
    print(f"❌  Vazios/null:         {len(vazios)}")
    print()

    if arquivos:
        print("─" * 60)
        print("⚠️  AINDA SÃO NOMES DE ARQUIVO (precisam de upload):")
        print("─" * 60)
        for pid, nome, img in arquivos:
            print(f"  ID {pid:3} — {nome[:35]:<35} → {img}")
        print()

    if vazios:
        print("─" * 60)
        print("❌  VAZIOS/NULL:")
        print("─" * 60)
        for pid, nome, img in vazios:
            print(f"  ID {pid:3} — {nome[:35]}")
        print()

    if urls:
        print("─" * 60)
        print("✅  PRIMEIRAS 5 URLs DO CLOUDINARY (amostra):")
        print("─" * 60)
        for pid, nome, img in urls[:5]:
            print(f"  ID {pid:3} — {nome[:30]:<30}")
            print(f"         {img}")
        print()

    print("=" * 60)
    print("  RESUMO")
    print("=" * 60)
    total = len(produtos)
    print(f"  Total produtos:    {total}")
    print(f"  Com URL:           {len(urls)} ({len(urls)*100//total if total else 0}%)")
    print(f"  Precisam upload:   {len(arquivos)}")
    print(f"  Pendente/OK:       {len(pendentes)}")
    print(f"  Vazios:            {len(vazios)}")
    print()

    if len(arquivos) > 0:
        print("💡 Ainda tem arquivos para subir.")
        print("   Rode: python upload_imagens_v2.py")
    elif len(urls) == 0:
        print("💡 Nenhuma URL encontrada — o upload ainda não foi feito.")
    else:
        print("🎉 Todas as imagens disponíveis já estão no Cloudinary!")

if __name__ == '__main__':
    try:
        import requests
    except ImportError:
        print("❌ requests não instalado. Rode: pip install requests")
        exit(1)
    main()
