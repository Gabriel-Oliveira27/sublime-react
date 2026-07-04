# Relatório de Vulnerabilidades — Encontradas & Resolvidas

**Projeto:** Sublime (loja Next.js + dashboard do vendedor + app mobile)
**Data da auditoria:** 04/07/2026
**Branch:** `auditoria-seguranca-2026-07`
**Escopo:** loja (raiz), rotas de API (`app/api/**`), camada de dados (`lib/**`), dashboard (`dashboard/dashboard-vendedor`).

---

## 1. Resumo executivo

O código **já havia passado por um hardening anterior** (ver `Documentação/3-VULNERABILIDADES.md`, de 02/06/2026). A maioria dos itens críticos/altos daquele documento **já estava corrigida** no código atual: rate limiting, CORS restrito, checksum de CPF, validação com Zod, `bcrypt` com normalização de timing, `logger` centralizado e autenticação no upload. Bom trabalho de base.

Esta auditoria focou no que **restava** — e encontrou 6 problemas concretos, todos tratados nesta branch.

| # | Severidade | Problema | Status |
|---|-----------|----------|--------|
| V1 | 🟠 Alta | IDOR / vazamento de PII por enumeração de VDs sequenciais em `/api/pedidos/rastrear` | ✅ Mitigado |
| V2 | 🟡 Média | HSTS e `poweredByHeader:false` nunca aplicados (arquivo `next.config.mjs` morto) | ✅ Corrigido |
| V3 | 🟡 Média | XSS armazenado (injeção de atributo) no `renderMarkdown` de descrição de produto | ✅ Corrigido |
| V4 | 🟡 Média | Endereços de clientes expostos por CPF sem autenticação nem limite de taxa | ✅ Mitigado |
| V5 | 🟢 Baixa | `dangerouslySetInnerHTML` desnecessário no `SuccessModal` (superfície de XSS) | ✅ Removido |
| V6 | 🟢 Baixa | Código morto / segredo hardcoded / import não usado / função com bug latente | ✅ Removido |

Além disso, a **Seção 3** lista riscos residuais que recomendo tratar mas que **não** foram alterados nesta branch (exigem decisão de produto, migração de dados ou infraestrutura).

---

## 2. Detalhamento do que foi corrigido

### V1 — IDOR / Enumeração de PII em `/api/pedidos/rastrear` 🟠

**Arquivo:** `app/api/pedidos/rastrear/route.ts`

**Problema:** a busca por `?id=VD-001` fazia `findUnique` e devolvia o **pedido inteiro** — incluindo `nome`, `contato` (telefone), `endereco` e demais dados pessoais — **sem qualquer autenticação**. Como o `idRastreio` é **sequencial** (`VD-${id.padStart(3,'0')}`), qualquer pessoa podia percorrer `VD-001`, `VD-002`, `VD-003`… e colher os dados pessoais de **todos os clientes** da loja. Classe: OWASP A01 (Broken Access Control) / IDOR + exposição de PII.

**Correção aplicada:**
- A resposta pública agora usa uma **projeção mínima** (`PUBLIC_SELECT`): apenas `idRastreio`, `etapa`, `pedido`, `totalVenda` e `dataCompra` — exatamente o que a tela de acompanhamento (`app/compras/page.jsx`) consome. **Nome, telefone e endereço não saem mais** do endpoint.
- Adicionado **rate limiting por IP** (`checkRateLimit(ip, 'rastrear')`) para dificultar varredura em massa.
- A mesma projeção mínima foi aplicada à busca por CPF+telefone (minimização de dados).

**Observação:** a correção reduz drasticamente o impacto, mas a causa raiz (VD sequencial e adivinhável) permanece — ver **Seção 3.1** para o fix definitivo (tornar o `idRastreio` não-enumerável).

---

### V2 — HSTS e headers de segurança nunca aplicados (config duplicada) 🟡

**Arquivos:** `next.config.js` (mantido/unificado), `next.config.mjs` (**removido**)

**Problema:** existiam **dois** arquivos de configuração do Next — `next.config.js` **e** `next.config.mjs`. O Next resolve apenas o primeiro (`.js`), então **todo o conteúdo do `.mjs` era silenciosamente ignorado**, incluindo:
- `Strict-Transport-Security` (HSTS) → o site **não** forçava HTTPS via header;
- `poweredByHeader: false` → o header `X-Powered-By: Next.js` continuava vazando a stack;
- `images.unoptimized`.

Bug silencioso clássico: a intenção de segurança estava no código, mas **sem efeito nenhum** em produção.

**Correção aplicada:** unifiquei tudo em `next.config.js` — mantive a CSP (que já existia lá) e **recuperei** o HSTS (`max-age=63072000; includeSubDomains; preload`, aplicado a `/:path*`, inclusive `/api`) e o `poweredByHeader: false`. O `next.config.mjs` foi deletado. (O `images.unoptimized` foi descartado de propósito: o `next/image` **não é usado** em lugar nenhum — ver V6.)

---

### V3 — XSS armazenado por injeção de atributo no `renderMarkdown` 🟡

**Arquivo:** `components/store/ProductDescription.jsx`

**Problema:** a descrição do produto (`detalhes`) é renderizada via `dangerouslySetInnerHTML` após passar por um mini-conversor de markdown. Ele escapava `&`, `<` e `>`, **mas não as aspas**. A regra de link (`[texto](url)`) injeta a URL casada dentro de `href="..."`. Como `"` não era escapada, uma descrição maliciosa como:

```
[clique](https://x" onmouseover="alert(document.cookie))
```

gerava `<a href="https://x" onmouseover="alert(document.cookie)" …>` — **injeção de atributo** = XSS armazenado. Em loja de dono único o risco é baixo (só o admin edita), mas vira **crítico no cenário SaaS** (um lojista-cliente malicioso injeta script que roda no navegador dos consumidores).

**Correção aplicada:** o passo de escape agora também neutraliza aspas **antes** de qualquer transformação:

```js
.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
```

As aspas que usamos nas tags geradas são adicionadas **depois** desse passo, então continuam válidas. O regex de link já exigia `https?://`, o que impede `javascript:`.

---

### V4 — Endereços de clientes expostos por CPF sem autenticação 🟡

**Arquivo:** `app/api/clientes/enderecos/route.ts`

**Problema:** `GET /api/clientes/enderecos?cpf=…` devolve os últimos endereços salvos do cliente **sem autenticação e sem limite de taxa**. Um atacante com uma lista de CPFs (facilmente obtíveis) poderia coletar endereços em massa. É intencional que seja público (o checkout pré-preenche o endereço ao digitar o CPF), mas faltava proteção contra varredura.

**Correção aplicada:** adicionado **rate limiting por IP** (`checkRateLimit(ip, 'enderecos')`). Reduz o abuso em massa. Fix definitivo (exigir confirmação de identidade) em **Seção 3.2**.

---

### V5 — `dangerouslySetInnerHTML` desnecessário no `SuccessModal` 🟢

**Arquivo:** `components/checkout/SuccessModal.jsx`

**Problema:** a mensagem de sucesso era montada como string HTML com `orderId`/`dateStr` interpolados e injetada via `dangerouslySetInnerHTML`. Os valores hoje são controlados (server-side), então o risco real é baixo — mas é uma superfície de XSS gratuita.

**Correção aplicada:** a mensagem passou a ser renderizada em **JSX** (`renderMessage()`), onde o React escapa os valores automaticamente. `dangerouslySetInnerHTML` eliminado deste componente.

---

### V6 — Código morto, segredo hardcoded e bug latente 🟢

| Item | Arquivo | Ação |
|------|---------|------|
| `trackByCPF()` — função **nunca importada** e ainda **bugada** (mandava só `cpf`, mas a rota exige `phone` → sempre 401) | `lib/api.js` | Removida |
| `import Image from 'next/image'` — importado mas **nunca usado** (o componente usa `<img>` puro) | `components/cart/CartSidebar.jsx` | Removido |
| `PIX_KEY: 'c7172483-…'` — chave hardcoded e **morta** (nenhum componente lê `CONFIG.API.PIX_KEY`; a chave real vem do banco via `/api/config/pix`) | `lib/config.js` | Removida |

Isso reduz superfície, remove um segredo do código e elimina uma função que, se fosse chamada, quebraria.

---

## 3. Riscos residuais (recomendações — NÃO alterados nesta branch)

Estes itens precisam de decisão sua (produto, migração de dados ou infraestrutura). Estão priorizados.

### 3.1 — `idRastreio` sequencial e adivinhável 🟠 (raiz do V1)
Mesmo com a projeção mínima, um VD sequencial ainda permite inferir volume de vendas e confirmar existência de pedidos. **Fix definitivo:** anexar um sufixo aleatório ao código exibido ao cliente, ex.: `VD-014-7QF3`, e buscar por esse valor completo. É uma mudança de dados/formato — planejar migração dos pedidos existentes.

### 3.2 — `clientes/enderecos` sem verificação de identidade 🟡 (raiz do V4)
O rate limit ajuda, mas o ideal é exigir um segundo fator leve (ex.: últimos 4 dígitos do telefone) antes de devolver endereços — sem prejudicar demais a UX de autopreenchimento.

### 3.3 — Rate limiting em memória não vale em serverless 🟠
`app/api/auth/login/ratelimit.ts` usa um `Map` em memória. Na Vercel, **cada instância tem seu próprio contador** — o limite global não é garantido, e um atacante distribuído contorna. O próprio arquivo já documenta isso. **Recomendação:** migrar para Upstash Redis (`@upstash/ratelimit`) para limite global consistente. Vale para login, pedidos, rastrear e enderecos.

### 3.4 — JWT de 7 dias sem revogação 🟡
`lib/jwt.ts` emite token de 7 dias sem refresh token nem lista de revogação. Se um token vazar, vale 7 dias e o logout não o invalida no servidor (só apaga o cookie no cliente). **Recomendação:** access token curto (15 min) + refresh token, **ou** um campo `tokenVersion` no `Usuario` incluído no payload e conferido em `verifyJwt` (permite “desconectar de todos os dispositivos”).

### 3.5 — Cookie `SameSite=None` e CSRF 🟡
O cookie de auth usa `SameSite=None` (necessário porque o dashboard roda em outra origem). Isso **por si** abriria brecha de CSRF, **mas** está mitigado pelo CORS restrito: como o `Access-Control-Allow-Origin` é o `DASHBOARD_ORIGIN` (não `*`) e as chamadas mutantes são não-simples (PATCH/DELETE/JSON), o navegador bloqueia no preflight requisições de origens maliciosas. **Recomendação:** manter o CORS estrito e considerar um CSRF token de dupla submissão como defesa em profundidade.

### 3.6 — CORS inconsistente entre handlers `OPTIONS` 🟢
Vários `OPTIONS` fixam `Access-Control-Allow-Origin: *` na mão (`cupons`, `cupons/validar`, `cupons/consumir`, `config/pix`, `config/public`, `pedidos/[id]/etapa`, `rastrear`) enquanto outros usam `corsOptions()` (que lê `DASHBOARD_ORIGIN`). Para endpoints **públicos de leitura** o `*` é aceitável, mas `config/pix` (cujo GET exige cookie) com `*` é contraditório. **Recomendação:** padronizar tudo em `corsOptions()`/`CORS_HEADERS` e deixar `*` apenas onde for de fato público e sem credenciais.

### 3.7 — `console.error(err)` cru em várias rotas 🟢
Rotas como `auth/login`, `auth/me`, `usuarios` ainda usam `console.error('[ctx]', err)` direto em vez do `logError` de `lib/logger.ts`, que já mascara detalhes em produção. **Recomendação:** trocar por `logError` para não vazar stack traces nos logs de produção.

### 3.8 — Segredo de admin em texto puro no `.env` 🟡
`ADMIN_EMAIL`/`ADMIN_PASSWORD` no `.env` e usados no seed. O `.env` **não** está versionado (verificado — `git ls-files` não o lista, e o `.gitignore` cobre `.env*`), o que é correto. Ainda assim, senha de admin em texto puro é frágil. **Recomendação:** provisionar o admin com senha aleatória forte e forçar troca no primeiro login; nunca reutilizar essa senha.

### 3.9 — Sem paginação real em `/api/pedidos` (GET) 🟢
Há um `take: 500` de segurança, mas sem `skip`/`take` paginado. Aceitável hoje; implementar paginação antes de escalar.

### 3.10 — Sem testes automatizados 🟢
Não há suíte de testes. Recomendado ao menos testes de integração dos endpoints de pagamento/pedido/cupom, que concentram a lógica financeira.

---

## 4. O que já estava bem-feito (créditos)

Para contexto — estes controles **já existiam** e foram verificados como corretos:

- **Sem SQL Injection:** todo acesso a dados é via **Prisma ORM** com queries parametrizadas. O único `queryRaw` é `SELECT 1` estático no healthcheck. Nenhum `$queryRawUnsafe`/`$executeRawUnsafe`.
- **Preços recalculados no servidor:** `/api/pedidos` ignora `total`/`valor` do cliente e recalcula tudo a partir do banco, dentro de **transação atômica** (anti price-tampering e anti stock-leak).
- **Cupom com decremento atômico e condicional** (`updateMany` com `quantidadeUsos > 0`) — sem race condition.
- **Login endurecido:** `bcrypt` com **normalização de timing** contra user enumeration, rate limit, validação Zod.
- **Autorização por permissão no servidor** (`exigirPermissao`) — não confia só na UI; um funcionário “somente leitura” não edita via chamada direta.
- **Upload autenticado** com allow-list de MIME e limite de 10 MB.
- **CPF validado com checksum** no servidor.
- **CSP** presente para as páginas HTML.

---

## 5. Como validar as correções

```bash
git checkout auditoria-seguranca-2026-07
npx tsc --noEmit -p tsconfig.json      # type-check limpo (verificado)

# HSTS + sem X-Powered-By (após deploy):
curl -sI https://SEU-DOMINIO/ | grep -iE "strict-transport|x-powered-by"

# V1 — enumeração agora só devolve dados não-sensíveis:
curl -s "https://SEU-DOMINIO/api/pedidos/rastrear?id=VD-001" | jq
#   → { "order": { idRastreio, etapa, pedido, totalVenda, dataCompra } }  (sem nome/telefone/endereço)
```
