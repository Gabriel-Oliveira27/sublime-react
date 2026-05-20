

import os
import re
import bcrypt
import psycopg2

# ── Lê DATABASE_URL do .env ──────────────────────────────────
def ler_env():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if not os.path.exists(env_path):
        raise FileNotFoundError('.env não encontrado na raiz do projeto')
    with open(env_path, encoding='utf-8') as f:
        for linha in f:
            linha = linha.strip()
            if linha.startswith('DATABASE_URL'):
                url = linha.split('=', 1)[1].strip().strip('"').strip("'")
                return url
    raise ValueError('DATABASE_URL não encontrada no .env')

# ── Usuários ─────────────────────────────────────────────────
USUARIOS = [
    {
        'nome':    'Gabriel de Oliveira Bezerra',
        'apelido': 'Gabriel',
        'email':   'gabriel@sublime.com',
        'senha':   'troque-essa-senha-gabriel',
    },
    {
        'nome':    'Delma Pereira de Oliveira',
        'apelido': 'Delma',
        'email':   'delma@sublime.com',
        'senha':   'troque-essa-senha-delma',
    },
]

def main():
    print('🔌 Conectando ao Neon...')
    url = ler_env()
    conn = psycopg2.connect(url)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        print('👤 Criando usuários...\n')

        for u in USUARIOS:
            # Gera hash bcrypt
            senha_hash = bcrypt.hashpw(
                u['senha'].encode('utf-8'),
                bcrypt.gensalt(rounds=12)
            ).decode('utf-8')

            cur.execute("""
                INSERT INTO "Usuario" (nome, apelido, email, senha, ativo)
                VALUES (%s, %s, %s, %s, true)
                ON CONFLICT (email) DO NOTHING
            """, (u['nome'], u['apelido'], u['email'], senha_hash))

            if cur.rowcount > 0:
                print(f'  ✅ {u["apelido"]} criado')
                print(f'     Email: {u["email"]}')
                print(f'     Senha inicial: {u["senha"]}')
                print(f'     ⚠️  Troque após o primeiro login!\n')
            else:
                print(f'  ⏭️  {u["apelido"]} já existe, pulado.\n')

        # Config PIX
        cur.execute("""
            INSERT INTO "Config" (chave, valor)
            VALUES ('PIX_KEY', '')
            ON CONFLICT (chave) DO NOTHING
        """)

        if cur.rowcount > 0:
            print('  ✅ Config PIX inicializada')
        else:
            print('  ⏭️  Config PIX já existe, pulada.')

        conn.commit()
        print('\n🎉 Seed de usuários concluído!')

    except Exception as e:
        conn.rollback()
        print(f'\n❌ Erro — rollback feito: {e}')
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    # Verifica dependências
    try:
        import bcrypt
        import psycopg2
    except ImportError as e:
        print(f'❌ Dependência faltando: {e}')
        print('   Rode: pip install bcrypt psycopg2-binary')
        exit(1)

    main()
