# Auditoria Sublime — 04/07/2026

Auditoria de segurança, qualidade e prontidão do projeto Sublime, feita na branch
`auditoria-seguranca-2026-07`.

## Índice

1. **[01-RELATORIO-VULNERABILIDADES.md](01-RELATORIO-VULNERABILIDADES.md)**
   Vulnerabilidades, redundâncias e bugs **encontrados e resolvidos** nesta branch,
   além dos riscos residuais recomendados (com o que já estava bem-feito).

2. **[02-RELATORIO-MELHORIAS.md](02-RELATORIO-MELHORIAS.md)**
   Comparação com Mercado Livre, Magalu e Americanas — UX (foco mobile),
   funcionalidades, performance e conversão, com roadmap de 90 dias.

3. **[03-RELATORIO-SAAS-MULTITENANT.md](03-RELATORIO-SAAS-MULTITENANT.md)**
   O que precisa mudar para **vender acessos SaaS** a outros lojistas
   (isolamento por tenant, branding, billing) e chegar ao "ready to deploy".

## Correções aplicadas nesta branch (resumo)

| Arquivo | Mudança |
|---------|---------|
| `next.config.js` + remoção de `next.config.mjs` | Unifica config; recupera HSTS e `poweredByHeader:false` que eram ignorados |
| `app/api/pedidos/rastrear/route.ts` | Corta vazamento de PII (projeção mínima) + rate limit |
| `app/api/clientes/enderecos/route.ts` | Rate limit contra varredura de CPFs |
| `components/store/ProductDescription.jsx` | Fecha XSS por injeção de atributo no markdown |
| `components/checkout/SuccessModal.jsx` | Remove `dangerouslySetInnerHTML` (usa JSX) |
| `lib/api.js` | Remove `trackByCPF` (código morto + bug latente) |
| `components/cart/CartSidebar.jsx` | Remove import `next/image` não usado |
| `lib/config.js` | Remove `PIX_KEY` hardcoded (morta) |

Validação: `npx tsc --noEmit -p tsconfig.json` → **sem erros**.
