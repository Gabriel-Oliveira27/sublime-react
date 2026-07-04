# Relatório de Melhorias — Sublime vs. Grandes Lojas

**Referências de mercado:** Mercado Livre, Magazine Luiza (Magalu), Americanas.
**Objetivo:** elevar UX (com foco em mobile), segurança percebida, funcionalidades e conversão ao patamar dos grandes.
**Data:** 04/07/2026

> Este relatório é **propositivo** — não altera código. Cada item traz: o que os grandes fazem, onde o Sublime está hoje, e a recomendação. Priorizado por **impacto na conversão × esforço**.

---

## 0. Leitura rápida (o que fazer primeiro)

| Prioridade | Item | Impacto | Esforço |
|-----------|------|---------|---------|
| 🥇 1 | Avaliações/reviews de produto | Conversão + confiança | Médio |
| 🥇 2 | QR Code PIX + confirmação de pagamento | Conversão + operação | Médio |
| 🥇 3 | Busca com sugestões e ordenação | Descoberta | Médio |
| 🥈 4 | PWA (instalável + offline básico) | Recorrência mobile | Baixo |
| 🥈 5 | Selos de confiança + política clara | Confiança | Baixo |
| 🥈 6 | Otimização de imagens (LCP) | Performance mobile | Baixo |
| 🥉 7 | Wishlist / favoritos | Recorrência | Baixo |
| 🥉 8 | Analytics + eventos de funil | Decisão de negócio | Baixo |

---

## 1. UX Mobile (a prioridade que você pediu)

**Base atual (boa):** design tokens consistentes (`globals.css`), `focus-visible`, tipografia com fontes serif/sans bem definidas, sidebar de carrinho, toasts, timeline de pedido. Há trabalho recente de mobile (altura do botão Reservar, loader nas fotos).

**O que os grandes fazem e o Sublime pode adotar:**

1. **Bottom navigation fixa no mobile.** ML/Magalu usam uma barra inferior fixa (Início, Buscar, Carrinho, Pedidos, Conta). É o padrão que mais reduz fricção no polegar. Hoje o Sublime depende do header + side menu. **Recomendação:** barra inferior fixa em telas `< 768px`.
2. **Alvos de toque ≥ 44×44px.** O `.btn` já tem `height: 44px` — ótimo. Auditar botões menores (qty `−/+` no carrinho, chips de filtro, “Remover”) para garantir o mesmo mínimo.
3. **Sticky “add to cart” na página de produto.** Nos grandes, o botão de compra fica fixo no rodapé ao rolar a ficha do produto. Aumenta conversão no mobile.
4. **Skeletons em vez de spinner.** Já existe `Skeleton` no dashboard; trazer skeletons para a grade de produtos da loja (percepção de velocidade que ML/Magalu exploram).
5. **Gestos:** swipe para fechar a `CartSidebar`/modais e swipe entre fotos do produto (o `ProductImageCarousel` já existe — garantir gesto de arrastar no touch).
6. **Feedback de erro inline** nos campos do checkout (não só toast) — mensagem embaixo do campo, como Magalu.
7. **`viewport-fit=cover` + safe-area insets** para iPhones com notch (evita o botão fixo colar na barra de gestos).

---

## 2. Descoberta & Busca

**Hoje:** a busca (`app/page.jsx`) é **client-side**, por substring sobre os produtos já carregados (`applyFiltersToGroups` + `norm`). Funciona bem no catálogo atual, mas não escala e não perdoa erros de digitação.

**Grandes lojas:** busca com autocomplete, correção (“você quis dizer”), sinônimos, ordenação (relevância/preço/mais vendidos) e filtros facetados com contagem.

**Recomendações:**
- **Autocomplete/sugestões** conforme digita (mesmo client-side, mostrando produtos e categorias).
- **Ordenação** explícita: menor preço, maior preço, novidades, mais vendidos.
- **Filtros com contagem** (“Freezer (12)”) e chips removíveis do que está aplicado.
- Quando o catálogo crescer, **mover busca/paginação para o servidor** (índice no Postgres com `to_tsvector`/trigram) — evita baixar tudo no cliente.
- **Estado vazio de busca** com sugestões de produtos populares (reduz beco sem saída).

---

## 3. Página de Produto (ficha)

**Grandes lojas priorizam:** galeria com zoom, avaliações com nota média e fotos de clientes, “perguntas e respostas”, estimativa de entrega por CEP **na própria ficha**, parcelamento em destaque, e “quem viu também viu”.

**Recomendações para o Sublime:**
- **Avaliações (reviews)** — ver Seção 7 (é o item de maior impacto).
- **Calcular frete/prazo por CEP na ficha** (a lógica de frete já existe em `lib/utils.js`/`computeShippingCost`; hoje o cálculo aparece mais no checkout).
- **Parcelamento em destaque** (“12x de R$ X”) usando a tabela `INSTALLMENT_FEES` que já existe.
- **Cross-sell**: “produtos relacionados” por `linha`.
- **Zoom na imagem** (o `PhotoLightbox` já existe — garantir zoom/pinch no mobile).

---

## 4. Checkout & Pagamento (maior alavanca de conversão)

**Hoje:** checkout com CPF opcional, endereço via ViaCEP, cálculo de frete, cupom, e PIX **manual** (o cliente copia a chave e envia comprovante por WhatsApp). Pagamento em dinheiro/crédito é combinado.

**Grandes lojas:** pagamento integrado (PIX com QR + confirmação automática, cartão tokenizado, aprovação em segundos), 1-click, carteira salva.

**Recomendações (ordem de valor):**
1. **PIX com QR Code + confirmação automática.** Integrar um PSP (Mercado Pago, Pagar.me, Asaas, Stripe) para gerar QR dinâmico e **receber webhook de confirmação** — elimina o “envie o comprovante” e a conferência manual. Enorme ganho operacional e de conversão.
2. **Checkout em uma página / progressivo** com resumo sempre visível (o `OrderSummary` já existe).
3. **Salvar dados do cliente** (com consentimento) para recompra rápida — o autopreenchimento de endereço por CPF já é um começo (ver V4 do relatório de segurança para reforçar identidade).
4. **Prevenir pedido duplicado** (double-submit): desabilitar o botão durante o envio e, no servidor, uma chave de idempotência por pedido.
5. **Mensagens de erro específicas** (“estoque insuficiente para X”) já existem no backend — expor bem no front.

---

## 5. Confiança & Prova Social

Os grandes vendem **confiança** tanto quanto produto. O Sublime pode adotar, com baixo esforço:
- **Selos**: “Compra segura”, “Site protegido”, formas de pagamento aceitas, no rodapé e no checkout.
- **Políticas claras e acessíveis**: troca/devolução, privacidade (LGPD), prazo de entrega, contato.
- **Avaliações visíveis** (Seção 7).
- **Status de pedido rico** (a timeline em `app/compras` já é um diferencial — evoluir com data/hora por etapa e notificação).

---

## 6. Performance & Acessibilidade (Core Web Vitals)

Google e os grandes tratam isso como fator de ranqueamento e conversão.
- **Imagens:** hoje o `next/image` **não** é usado (removido um import morto nesta auditoria) — as imagens são `<img>` cru. Adotar `next/image` (com `remotePatterns` do Cloudinary) ou ao menos `loading="lazy"`, `width/height` (evita layout shift) e `srcset`/formatos modernos (WebP/AVIF). Melhora LCP no mobile.
- **Fontes:** o `@import` de Google Fonts no CSS bloqueia render. Usar `next/font` (self-host, `display: swap`) elimina o bloqueio e o request externo.
- **Acessibilidade:** já há `focus-visible` e `aria-*` em vários pontos. Auditar contraste (texto rosa sobre creme), `alt` em todas as imagens, e navegação por teclado nos modais (foco preso + Esc).
- **Lighthouse/CI:** rodar Lighthouse no CI e vigiar LCP/CLS/INP.

---

## 7. Funcionalidades que faltam (vs. marketplaces)

| Funcionalidade | ML/Magalu/Americanas | Sublime hoje | Recomendação |
|----------------|----------------------|--------------|--------------|
| **Avaliações/reviews** | ✅ centrais | ❌ | **Alta.** Nota + comentário + foto; média na ficha e no card |
| **Wishlist/favoritos** | ✅ | ❌ | Média. Aumenta recorrência |
| **Conta do cliente** | ✅ login social | Parcial (rastreio por CPF/VD) | Média. Área logada com histórico e endereços |
| **Notificações** | ✅ push/e-mail | Push só para vendedor (app) | Média. Push/e-mail de status para o cliente |
| **Cupons/promoções** | ✅ | ✅ (cupons) | Evoluir: campanhas, frete grátis por faixa (já há tiers) |
| **PIX integrado** | ✅ | Manual | **Alta** (Seção 4) |
| **Comparar produtos** | ✅ | ❌ | Baixa |
| **PWA/App** | ✅ | Site + app do vendedor | **Alta**: PWA instalável para o cliente |

---

## 8. Retenção & Marketing

- **PWA** (manifest + service worker): instalável na tela inicial, splash, e cache básico offline. Baixo esforço, alto efeito de recorrência no mobile.
- **Recuperação de carrinho abandonado** (o carrinho já persiste em `localStorage`): lembrete por WhatsApp/e-mail.
- **Analytics de funil** (ver→carrinho→checkout→pago) com GA4/Umami/PostHog. Sem isso, você otimiza no escuro.
- **SEO**: metadados por produto (Open Graph, JSON-LD `Product`/`Offer`), sitemap, URLs limpas (o `slugify` já ajuda). Rende tráfego orgânico como nos grandes.

---

## 9. Resumo — roadmap sugerido (90 dias)

- **Mês 1 (conversão):** PIX integrado com QR+webhook; avaliações de produto; prevenção de pedido duplicado; selos de confiança.
- **Mês 2 (mobile/perf):** PWA; bottom nav mobile; `next/image` + `next/font`; sticky add-to-cart; skeletons na loja.
- **Mês 3 (crescimento):** busca com sugestões/ordenação; SEO (JSON-LD/sitemap); analytics de funil; wishlist; recuperação de carrinho.

O Sublime já tem uma base de design e de backend acima da média para um projeto deste porte. O salto para “nível grande loja” está mais em **pagamento integrado, prova social e mobile-first (PWA + bottom nav)** do que em reescrever o que já existe.
