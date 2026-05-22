"""
upload_imagens_v2.py
─────────────────────
Passo 1: Sobe as imagens pro Cloudinary
Passo 2: Atualiza cada produto via API do Vercel (sem conexão direta ao banco)

USO:
  1. Coloque na raiz do projeto (junto do .env)
  2. Rode: python upload_imagens_v2.py
"""

import os
import re
import json
import requests
import cloudinary
import cloudinary.uploader

# ── Configurações ─────────────────────────────────────────────
API_BASE      = "https://sublime-react.vercel.app"
EMAIL_LOGIN   = "gabriel@sublime.com"
SENHA_LOGIN   = "gabriel*27"
PASTA_IMAGENS = "public/imagens_produtos"

# ─────────────────────────────────────────────────────────────

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

def limpar_nome(nome: str) -> str:
    nome = re.sub(r'\s*\(.*?\)', '', nome)
    return nome.strip()

def eh_imagem_valida(nome: str) -> bool:
    if not nome:
        return False
    nome_lower = nome.lower().strip()
    if nome_lower in ('pendente', 'ok', '-', ''):
        return False
    extensoes = ('.png', '.jpg', '.jpeg', '.webp', '.gif')
    return any(nome_lower.endswith(ext) for ext in extensoes)

def fazer_login(email: str, senha: str) -> str:
    print("🔐 Fazendo login na API...")
    res = requests.post(
        f"{API_BASE}/api/auth/login",
        json={"email": email, "senha": senha},
        timeout=15,
    )
    if res.status_code != 200:
        raise Exception(f"Login falhou: {res.status_code} — {res.text}")
    token = res.json().get("token")
    if not token:
        raise Exception("Token não retornado pelo login")
    print("✅ Login realizado!\n")
    return token

def buscar_estoque(token: str) -> list:
    print("📦 Buscando produtos no banco via API...")
    res = requests.get(
        f"{API_BASE}/api/estoque",
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    if res.status_code != 200:
        raise Exception(f"Erro ao buscar estoque: {res.status_code} — {res.text}")
    produtos = res.json()
    print(f"   {len(produtos)} produtos encontrados\n")
    return produtos

def atualizar_imagem(token: str, prod_id: int, url: str) -> bool:
    res = requests.patch(
        f"{API_BASE}/api/estoque/{prod_id}",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json={"imagem": url},
        timeout=15,
    )
    return res.status_code == 200

def main():
    print("=" * 58)
    print("  Upload Imagens → Cloudinary + Atualizar via API")
    print("=" * 58)
    print()

    # Carrega .env
    env = ler_env()

    cloud_name = env.get('CLOUDINARY_CLOUD_NAME')
    api_key    = env.get('CLOUDINARY_API_KEY')
    api_secret = env.get('CLOUDINARY_API_SECRET')

    if not all([cloud_name, api_key, api_secret]):
        print("❌ Credenciais do Cloudinary não encontradas no .env")
        return

    # Configura Cloudinary
    cloudinary.config(
        cloud_name = cloud_name,
        api_key    = api_key,
        api_secret = api_secret,
    )

    # Pasta de imagens
    ROOT          = os.path.dirname(os.path.abspath(__file__))
    pasta_completa = os.path.join(ROOT, *PASTA_IMAGENS.split("/"))

    if not os.path.isdir(pasta_completa):
        print(f"❌ Pasta não encontrada: {pasta_completa}")
        return

    # Login na API
    token = fazer_login(EMAIL_LOGIN, SENHA_LOGIN)

    # Busca produtos
    produtos = buscar_estoque(token)

    # Filtra só os que têm imagem válida e ainda não são URL
    para_processar = [
        p for p in produtos
        if p.get('imagem')
        and not str(p['imagem']).startswith('http')
        and eh_imagem_valida(str(p['imagem']))
    ]

    print(f"🖼️  {len(para_processar)} produtos com imagem para subir\n")

    ok        = 0
    pulados   = 0
    nao_achou = 0
    erros     = 0

    for p in para_processar:
        prod_id      = p['id']
        nome_produto = p.get('produto', '')[:35]
        imagem_atual = str(p['imagem'])
        nome_arquivo = limpar_nome(imagem_atual)
        caminho      = os.path.join(pasta_completa, nome_arquivo)

        if not os.path.exists(caminho):
            print(f"  ⚠️   ID {prod_id} — {nome_produto}")
            print(f"       Arquivo não encontrado: {nome_arquivo}\n")
            nao_achou += 1
            continue

        try:
            # Upload pro Cloudinary
            public_id = os.path.splitext(nome_arquivo)[0]
            resultado = cloudinary.uploader.upload(
                caminho,
                folder          = 'sublime/produtos',
                public_id       = public_id,
                use_filename    = True,
                unique_filename = False,
                overwrite       = True,
                transformation  = [
                    {'width': 800, 'height': 800, 'crop': 'limit'},
                    {'quality': 'auto', 'fetch_format': 'auto'},
                ],
            )
            url = resultado['secure_url']

            # Atualiza via API
            sucesso = atualizar_imagem(token, prod_id, url)

            if sucesso:
                print(f"  ✅  ID {prod_id} — {nome_produto}")
                print(f"       {url}\n")
                ok += 1
            else:
                print(f"  ❌  ID {prod_id} — {nome_produto}")
                print(f"       Upload ok mas API não atualizou\n")
                erros += 1

        except Exception as e:
            print(f"  ❌  ID {prod_id} — {nome_produto} → {e}\n")
            erros += 1

    # Relatório
    print("=" * 58)
    print(f"  ✅  Enviados e atualizados: {ok}")
    print(f"  ⏭️   Pulados (Pendente/OK):  {pulados}")
    print(f"  ⚠️   Arquivo não encontrado: {nao_achou}")
    print(f"  ❌  Erros:                  {erros}")
    print("=" * 58)

if __name__ == '__main__':
    try:
        import cloudinary
        import requests
    except ImportError as e:
        print(f"❌ Dependência faltando: {e}")
        print("   Rode: pip install cloudinary requests")
        exit(1)

    main()