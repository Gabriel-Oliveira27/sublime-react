# Relatório de Prontidão SaaS — Vender Acessos para Outros Clientes

**Objetivo:** transformar o Sublime (hoje loja de **um** dono) em uma plataforma onde você **vende acesso a vários lojistas**, cada um com sua loja, dashboard e dados isolados — e você faz alterações simples sob demanda com o código "ready to deploy".
**Data:** 04/07/2026

> Diagnóstico honesto: hoje o Sublime é **single-tenant** (um inquilino). Nada no banco separa dados por lojista, a configuração (endereço de origem, WhatsApp, PIX) é global/hardcoded e o CORS aponta para **uma** origem. Para SaaS, a mudança central é **isolamento por tenant**. Este relatório mostra exatamente onde e como.

---

## 1. O ponto crítico: isolamento de dados (multi-tenancy)

Hoje as tabelas `Estoque`, `Pedido`, `Cupom`, `Cliente`, `Config`, `FreteConfig`, `Usuario` (ver `prisma/schema.prisma`) **não têm noção de lojista**. Se você criasse dois clientes, eles veriam o estoque e os pedidos um do outro. Isso é o bloqueador nº 1.

**Três modelos possíveis:**

| Modelo | Como é | Prós | Contras | Indicação |
|--------|--------|------|---------|-----------|
| **Row-level `tenantId`** | uma coluna `tenantId` em cada tabela; toda query filtra por ela | simples, barato, 1 banco | risco de vazamento se esquecer um filtro | ✅ **Recomendado** para começar |
| Schema por tenant | um schema Postgres por lojista | bom isolamento | operação mais complexa | crescimento médio |
| Banco por tenant | um banco por lojista | isolamento máximo | caro/operacional | clientes enterprise |

**Recomendação:** comece com **row-level `tenantId`** e blindagem no acesso a dados (Seção 2).

### Mudanças no `schema.prisma`
- Criar modelo `Tenant` (id, slug, nome, domínio(s), plano, status, criadoEm).
- Adicionar `tenantId` em **todas** as tabelas de negócio e nos índices/uniques:
  - `Cupom.cupom @unique` → **`@@unique([tenantId, cupom])`** (dois lojistas podem ter o mesmo código).
  - `Cliente.cpf @unique` → **`@@unique([tenantId, cpf])`**.
  - `Usuario.email @unique` → **`@@unique([tenantId, email])`**.
  - `Pedido.idRastreio @unique` → **`@@unique([tenantId, idRastreio])`**.
  - `Config` (hoje PK = `chave`) → PK composta **`@@id([tenantId, chave])`**.
  - `FreteConfig` (hoje "singleton id=1") → um por tenant.
- Índices por `tenantId` nas tabelas grandes (`Pedido`, `Estoque`).

---

## 2. Blindagem de acesso (não confiar na disciplina de escrever o filtro)

O maior risco do row-level é **esquecer** o `where: { tenantId }` em uma query e vazar dados entre lojistas. Duas defesas:

1. **Prisma Client Extension / `$extends`** que injeta `tenantId` automaticamente em todo `find/create/update/delete` a partir do contexto da requisição. Assim, mesmo uma query "esquecida" fica escopada.
2. **Postgres Row-Level Security (RLS)** como rede de segurança no próprio banco (o Neon suporta). Mesmo com bug na aplicação, o banco recusa linhas de outro tenant.

Além disso: **todo endpoint** de `app/api/**` precisa derivar o `tenantId` de forma confiável (do JWT para o dashboard; do domínio/host para a loja pública) e nunca aceitá-lo do corpo da requisição.

---

## 3. Identidade do tenant por requisição

- **Dashboard (autenticado):** incluir `tenantId` no payload do JWT (`lib/jwt.ts` → interface `JwtPayload`) e validá-lo em `autenticar`/`exigirPermissao` (`lib/middleware.ts`). Toda ação passa a ser escopada ao tenant do usuário.
- **Loja pública:** resolver o tenant pelo **host/domínio** (ex.: `loja-a.sublime.app`, `loja-b.sublime.app` ou domínio próprio `lojadaana.com.br`). O `middleware.ts` já intercepta tudo — é o lugar natural para mapear `Host` → `tenantId` e repassar via header interno.

---

## 4. Configuração hoje hardcoded que precisa virar por-tenant

Estes pontos assumem **um** lojista. Cada um vira dado do tenant:

| Onde | Hoje (single-tenant) | Vira por-tenant |
|------|----------------------|-----------------|
| `lib/config.js` → `ORIGIN` (Rua Itacy…, Iguatu/CE) | endereço fixo da loja | endereço de origem do tenant (já existe `ORIGEM_*` na tabela `Config`) |
| `lib/config.js` → `WHATSAPP_NUMBER` | número fixo | WhatsApp do tenant (`Config`) |
| `lib/config.js` → `VERCEL_URL` | URL fixa | domínio do tenant |
| `Config` (PIX_KEY, toggles de pagamento, descontos) | linha global | escopada por `tenantId` (Seção 1) |
| `FreteConfig` | singleton id=1 | um por tenant |
| CORS `DASHBOARD_ORIGIN` (`middleware.ts`, `lib/cors.ts`) | **uma** origem | ver Seção 5 |
| Upload Cloudinary `folder: 'sublime/produtos'` (`app/api/upload`) | pasta única | `folder: tenant/<slug>/produtos` (isola e facilita limpeza/cota) |
| `INSTALLMENT_FEES`, `SHIPPING_TIERS`, `CAROUSEL_SLIDES` em `config.js` | globais | por-tenant (banco), com defaults |

**Boa notícia:** a tabela `Config` e o `FreteConfig` já centralizam boa parte disso — falta só o `tenantId` e mover o que ainda está em `config.js`.

---

## 5. Domínios, CORS e roteamento

Hoje `middleware.ts` e `lib/cors.ts` fixam **uma** origem (`DASHBOARD_ORIGIN`, default GitHub Pages). SaaS precisa de **CORS dinâmico**:
- Manter uma **allow-list de origens por tenant** (subdomínios `*.sublime.app` + domínios próprios verificados).
- No middleware, ecoar `Access-Control-Allow-Origin` **apenas** se a origem da requisição estiver na allow-list daquele tenant (nunca `*` com credenciais).
- Suportar **domínio próprio** do lojista (verificação por registro DNS/TXT, emissão de TLS — a Vercel automatiza via API de domínios).
- Padronizar todos os `OPTIONS` (ver item 3.6 do relatório de vulnerabilidades) para usar essa lógica única.

---

## 6. White-label / branding por tenant

Está alinhado com seu plano de **re-tema/rename** (registrado no histórico do projeto):
- **Tema/cores:** os design tokens em `globals.css` (`--rose`, `--lavender`, etc.) devem virar variáveis por tenant, servidas do banco e injetadas no `:root` no carregamento (o dashboard já tem `ThemeContext`).
- **Logo, nome, fontes, textos** (carrossel, rodapé, políticas) → dados do tenant.
- **Remover a marca "Sublime"** de textos fixos e do namespace (`sublime_auth`, `sublime_cart`, pasta Cloudinary) — parametrizar por tenant/plataforma.

---

## 7. Onboarding, billing e planos

Para **vender** acesso:
- **Provisionamento self-service:** criar tenant + admin + configs default + seed de exemplo em uma transação. Automatizar o que hoje é o `prisma/seed.ts`.
- **Assinatura/billing:** integrar Stripe Billing (ou Mercado Pago Assinaturas) — planos, trial, cobrança recorrente, suspensão por inadimplência (status do `Tenant`).
- **Limites por plano (entitlements):** nº de produtos, pedidos/mês, usuários, uploads, domínio próprio (sim/não). Aplicar nos endpoints.
- **Rate limiting por tenant** (além de por IP) e migrado para Redis (item 3.3 do relatório de vulnerabilidades) — evita um tenant derrubar os outros.

---

## 8. Segurança específica de SaaS (herda do relatório de vulnerabilidades)

- **XSS armazenado vira multi-vítima:** o fix do `renderMarkdown` (V3) passa de "bom" a **obrigatório** — um lojista malicioso não pode injetar script no navegador dos clientes de outro.
- **Isolamento de segredos:** credenciais de PSP/PIX de cada lojista **nunca** no código; guardar cifradas por tenant.
- **Revogação de sessão** (item 3.4): essencial para suspender um tenant inadimplente na hora (`tokenVersion` por usuário/tenant).
- **Auditoria (audit log):** registrar ações sensíveis por tenant/usuário (quem mudou preço, quem exportou dados).
- **LGPD por tenant:** cada lojista é controlador dos dados dos seus clientes — você é operador. Precisa de: contrato/DPA, exportação e exclusão de dados **por tenant**, e política de retenção.

---

## 9. Operação "ready to deploy"

- **Validação de ambiente no boot** (o `lib/jwt.ts` já valida `JWT_SECRET`; estender para `DATABASE_URL`, Cloudinary, etc. — falhar cedo e claro).
- **Migrations versionadas** (`prisma migrate`) em vez de mudanças manuais — cada alteração sua vira uma migration reproduzível.
- **CI/CD:** lint + `tsc --noEmit` + testes + `prisma migrate deploy` no pipeline; preview por PR (a Vercel dá isso).
- **Backups automáticos** e testados (Neon tem PITR) — item do relatório de vulnerabilidades.
- **Observabilidade:** Sentry (erros) + métricas por tenant + alertas.
- **Feature flags** por tenant/plano para você "ligar/desligar" recursos sem redeploy.
- ⚠️ **Atenção ao `.gitignore`:** hoje ele ignora `dashboard/` e `Documentação/`. Isso significa que **o dashboard não está versionado neste repositório** — reveja se é intencional antes de montar o pipeline (um SaaS precisa do dashboard no CI).

---

## 10. Roadmap de conversão para SaaS

**Fase 1 — Fundação de isolamento (bloqueadores)**
1. Modelo `Tenant` + `tenantId` em todas as tabelas + uniques compostas.
2. Escopo automático (Prisma `$extends`) + RLS no Postgres.
3. `tenantId` no JWT + resolução por host na loja.
4. CORS dinâmico por allow-list de tenant.

**Fase 2 — Configuração e branding por tenant**
5. Mover tudo de `config.js` para `Config`/`Tenant` (endereço, WhatsApp, PIX, fretes, parcelas, carrossel).
6. White-label: tema/cores/logo/textos por tenant; remover marca fixa.
7. Uploads isolados por pasta de tenant no Cloudinary.

**Fase 3 — Comercialização**
8. Onboarding self-service + seed automatizado.
9. Billing (Stripe/Mercado Pago) + planos/entitlements + suspensão.
10. Rate limit por tenant (Redis), audit log, revogação de sessão.

**Fase 4 — Operação madura**
11. Migrations + CI/CD + backups testados + Sentry + feature flags.
12. LGPD por tenant (export/delete/DPA) + domínio próprio automatizado.

---

## 11. Como pedir mudanças simples para mim (fluxo "ready to deploy")

Depois da Fase 1–2, a maioria dos pedidos vira ajuste de dados/config, não de código. Para eu executar rápido e com segurança:

- **Peça por resultado, não por arquivo:** "cliente X quer tema azul e frete grátis acima de R$150" — eu localizo o tenant/config e aplico.
- **Sempre em branch + relatório:** mantenho o padrão desta auditoria (branch dedicada, `tsc --noEmit`, resumo do diff) para você revisar antes do deploy.
- **Mudanças de schema viram migration** versionada (reproduzível em todos os ambientes).
- **Nada de segredo no chat/código:** credenciais de tenant via variáveis de ambiente/secret manager.

Com a base multi-tenant pronta, "adicionar um cliente" deixa de ser um fork do código e passa a ser **um registro no banco** — que é exatamente o que torna o Sublime vendável como SaaS.
