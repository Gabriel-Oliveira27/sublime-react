# 🆘 TROUBLESHOOTING & FAQ

**Última atualização**: 25 maio 2026

---

## 🔴 Erros Comuns

### 1. "PRISMA_CLIENT_ERROR: Prisma Client is not connected"

**Possíveis Causas**:
- DATABASE_URL não definida em `.env.local`
- PostgreSQL não está rodando
- Conexão com Neon expirou

**Solução**:
```bash
# 1. Verifique .env.local
cat .env.local | grep DATABASE_URL

# 2. Teste conexão
psql $DATABASE_URL -c "SELECT 1"

# 3. Recrie Prisma client
rm -rf node_modules/.prisma
npx prisma generate

# 4. Rode migrations
npx prisma migrate deploy

# 5. Restart server
npm run dev
```

---

### 2. "Error: ENOTFOUND: getaddrinfo ENOTFOUND <hostname>"

**Possíveis Causas**:
- Cloudinary não está configurado
- API externa inacessível
- Proxy/firewall bloqueando

**Solução**:
```bash
# 1. Verifique variáveis
echo $CLOUDINARY_CLOUD_NAME
echo $CLOUDINARY_API_KEY

# 2. Teste conexão com curl
curl -I https://api.cloudinary.com

# 3. Se usar VPN, configure
export HTTP_PROXY=http://...
export HTTPS_PROXY=http://...

# 4. Reinicie server
npm run dev
```

---

### 3. "TypeError: Cannot read property 'id' of undefined"

**Possíveis Causas**:
- Usuário não logado
- Sessão expirou
- JWT inválido

**Solução**:
```javascript
// Adicione verificação
export async function GET(req: NextRequest) {
  const auth = await autenticar(req)
  
  // ✅ Correto: verifica se é erro
  if (auth instanceof NextResponse) {
    return auth  // Retorna 401
  }
  
  // ✅ Seguro: auth.usuario sempre existe aqui
  const usuario = auth.usuario
  console.log(usuario.id)
}
```

---

### 4. "Image not loading from Cloudinary"

**Possíveis Causas**:
- URL incorreta
- Recurso deletado
- Pasta errada

**Solução**:
```javascript
// ✅ URL válida:
// https://res.cloudinary.com/seu_cloud_name/image/upload/sublime/produtos/xxxxx.jpg

// ❌ Inválida:
// https://res.cloudinary.com/v1.../image/upload/xxxx

// Verifique no dashboard Cloudinary:
// https://cloudinary.com/console/media_library
```

---

### 5. "SyntaxError: Unexpected token < in JSON"

**Possível Causa**:
- Endpoint retornou HTML em vez de JSON (error page)
- Servidor caiu ou está retornando erro 500

**Solução**:
```bash
# 1. Verifique se server está rodando
curl http://localhost:3000

# 2. Veja logs
npm run dev 2>&1 | grep -i error

# 3. Se erro 500, cheque database:
npx prisma db push

# 4. Restart
npm run dev
```

---

### 6. "EADDRINUSE: address already in use :::3000"

**Possível Causa**:
- Porta 3000 já está em uso (outro server rodando)

**Solução**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>

# Ou use porta diferente
npm run dev -- -p 3001
```

---

### 7. "JWTClaimsVerificationFailed"

**Possível Causa**:
- JWT_SECRET mudou
- Token expirou (max 7 dias)
- Token foi alterado

**Solução**:
```bash
# 1. Faça login novamente
curl -X POST http://localhost:3000/api/auth/login \
  -d '{"email":"admin@sublime.com","senha":"senha123"}'

# 2. Use novo token na requisição
curl http://localhost:3000/api/usuarios \
  -H "Authorization: Bearer <novo_token>"

# 3. Se JWT_SECRET mudou, invalida todos os tokens antigos
# (Todos os usuários precisam fazer login novamente)
```

---

### 8. "Validation Error: Expected number, received string"

**Possível Causa**:
- Tipo de dados errado no body
- JSON parseado incorretamente

**Solução**:
```javascript
// ❌ Errado
{
  "qtd": "50",      // String em vez de número
  "valor": 49.90
}

// ✅ Correto
{
  "qtd": 50,        // Número
  "valor": 49.90
}

// Ou convirta no frontend
const qtd = parseInt(body.qtd)
```

---

### 9. "CEP not found" / ViaCEP error

**Possível Causa**:
- CEP inválido
- ViaCEP indisponível

**Solução**:
```javascript
// Validação do CEP
function isValidCEP(cep) {
  return /^\d{5}-?\d{3}$/.test(cep)
}

// Se ViaCEP falhar, deixe usuário digitar
try {
  const endereco = await buscarCEP(cep)
} catch (err) {
  console.warn('ViaCEP indisponível, use manual')
  setManualAddress(true)
}
```

---

### 10. "Stock insufficient"

**Possível Causa**:
- Quantidade solicitada > quantidade disponível
- Múltiplos usuários comprando simultaneamente

**Solução**:
```javascript
// Backend valida e usa transação atômica
await prisma.$transaction(async (tx) => {
  const estoque = await tx.estoque.findUnique({ where: { id } })
  
  if (estoque.qtd < quantidade) {
    throw new Error('Stock insufficient')
  }
  
  await tx.estoque.update({
    where: { id },
    data: { qtd: { decrement: quantidade } }
  })
})

// Frontend mostra aviso
if (error.message.includes('insufficient')) {
  showToast('Quantidade não disponível', 'error')
}
```

---

## 🟡 Warnings e Avisos

### "Missing .env variable"

**Solução**:
```bash
# Copie .env.example (se existir)
cp .env.example .env.local

# Ou crie manualmente
cat > .env.local << EOF
DATABASE_URL=postgresql://...
JWT_SECRET=sua_chave_secreta_32_chars_minimo
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
NEXT_PUBLIC_API_URL=http://localhost:3000
EOF
```

---

### "Function declared multiple times"

**Possível Causa**:
- Arquivo duplicado
- Importação circular

**Solução**:
```bash
# Procure duplicatas
find . -name "*.ts" -o -name "*.jsx" | sort | uniq -d

# Remova duplicatas
rm app/api/estoque/estoque.route.ts  # Se houver duplicada
```

---

## 🟢 Verificações de Saúde

### Health Check Rápido

```bash
# 1. Server rodando?
curl http://localhost:3000

# 2. API respondendo?
curl http://localhost:3000/api/debug

# 3. Database conectado?
curl http://localhost:3000/api/estoque

# 4. Autenticação funcionando?
curl -X POST http://localhost:3000/api/auth/login \
  -d '{"email":"admin@sublime.com","senha":"senha123"}'
```

### Logs Úteis

```bash
# Ver erros do Next.js
npm run dev 2>&1 | grep -i error

# Ver erros do Prisma
DEBUG=* npm run dev

# Ver requests HTTP (frontend dev tools)
# F12 > Network > Filtrar "Fetch/XHR"

# Ver estado do React
# Instale React DevTools (Chrome extension)
```

---

## 📋 Checklist de Setup

- [ ] Node.js 18+ instalado (`node --version`)
- [ ] npm instalado (`npm --version`)
- [ ] Git configurado (`git config --global user.name`)
- [ ] `.env.local` criado com todas as variáveis
- [ ] `npm install` executado com sucesso
- [ ] `npx prisma migrate dev` rodou sem erros
- [ ] `npm run dev` inicia na porta 3000
- [ ] `http://localhost:3000` carrega a página
- [ ] Banco está acessível (`npx prisma db push`)
- [ ] Cloudinary funciona (teste upload)

---

## 🚀 Performance Issues

### "Page loads slowly"

**Verificações**:
```javascript
// 1. Verifique se está usando Next.js Image optimization
import Image from 'next/image'

// ✅ Correto
<Image 
  src={url} 
  width={200} 
  height={200} 
  alt="Produto" 
/>

// ❌ Ineficiente
<img src={url} />

// 2. Lazy load components
import dynamic from 'next/dynamic'
const CartSidebar = dynamic(() => import('./CartSidebar'), {
  loading: () => <div>Carregando...</div>
})

// 3. Limite queries ao banco
// Use select para trazer apenas campos necessários
const products = await prisma.estoque.findMany({
  select: { id, produto, valor, imagem }  // Não traz filtros, linhas inteiras
})
```

### "API responses slow"

**Verificações**:
```javascript
// 1. Adicione índices ao Prisma
// prisma/schema.prisma
model Estoque {
  ...
  @@index([linha])
  @@index([produto])
}

// 2. Pagine resultados
GET /api/estoque?skip=0&take=20

// 3. Use caching se apropriado
import { unstable_cache } from 'next/cache'

const getCachedProducts = unstable_cache(
  async () => prisma.estoque.findMany(),
  ['products'],
  { revalidate: 3600 }  // 1 hora
)
```

---

## 🔐 Segurança

### Checklist de Segurança

- [ ] JWT_SECRET tem mínimo 32 caracteres aleatórios
- [ ] DATABASE_URL não é commitado (está em `.env.local`)
- [ ] Cloudinary API_SECRET não é exposado (apenas no backend)
- [ ] CORS está configurado corretamente
- [ ] Senhas são hashed com bcrypt (rounds: 10+)
- [ ] Tokens expiram em 7 dias
- [ ] Middleware valida todas as rotas admin
- [ ] SQL Injection prevenido (usando Prisma)
- [ ] Cookies são HttpOnly (automático com Next.js)

---

## 🧪 Testes Locais

### Testar Endpoints com Insomnia/Postman

```
Importar arquivo de collection (future):
POST /api/auth/login
{
  "email": "admin@sublime.com",
  "senha": "senha123"
}

GET /api/estoque
Headers: [sem auth necessária]

POST /api/pedidos
Body: {
  "nome": "João",
  "contato": "(11) 99999-9999",
  "items": [{"id": 1, "qtd": 2, "valor": 49.90}],
  "tipo_entrega": "entrega",
  "endereco": "Rua X, 123",
  "frete": 15.00,
  "metodoPagamento": "PIX"
}
```

### Testar Frontend Localmente

```bash
# 1. Limpe cache
rm -rf .next

# 2. Reinicie servidor
npm run dev

# 3. Abra DevTools (F12)
# - Console: veja erros de JavaScript
# - Network: veja requisições HTTP
# - Application: verifique localStorage

# 4. Teste fluxos manualmente
# - Adicione produto ao carrinho
# - Complete checkout
# - Veja dados em localStorage
```

---

## 📞 Quando Pedir Ajuda

**Inclua**:
1. **Descrição do problema**: O que você tentava fazer?
2. **Mensagem de erro**: Copie exatamente (com traceback completo)
3. **Steps para reproduzir**: Como replicar o problema?
4. **Logs relevantes**: `npm run dev` com erro destacado
5. **Ambiente**: Node version, SO, npm version
6. **O que você já tentou**: Quais soluções testou?

**Exemplo Bom**:
> Erro ao fazer login de admin. Recebo "TypeError: Cannot read property 'permissoes' of null". 
> Steps: POST /api/auth/login com email correto + senha. 
> Ambiente: Node 18.12.0 em Windows 11.
> Log: [colar log completo aqui]
> Já tentei: resetar .env, limpar .next, reinstalar node_modules

---

## 🔗 Recursos Úteis

- [Documentação Next.js](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Hooks](https://react.dev/reference/react/hooks)
- [Cloudinary API](https://cloudinary.com/documentation/image_upload_api)
- [JWT.io](https://jwt.io)

---

## ✅ Solucionado?

Se resolveu seu problema, ajude outros:
1. Documente a solução aqui (pull request)
2. Compartilhe em issue do GitHub
3. Ajude no Discord/Slack da equipe

---

**Última atualização**: 25 maio 2026 | **Versão**: 1.0.0
