# Sublime — Next.js Store

Loja virtual Sublime migrada para **Next.js 14** com App Router. Pronta para deploy no Vercel.

## 🚀 Como rodar localmente

```bash
npm install
npm run dev
# Acesse http://localhost:3000
```

## 📦 Deploy no Vercel

1. Faça push do projeto para um repositório GitHub/GitLab/Bitbucket
2. Acesse [vercel.com](https://vercel.com) → **New Project** → importe o repositório
3. O Vercel detecta Next.js automaticamente — clique em **Deploy**
4. Pronto! Cada push na branch `main` faz deploy automático

## 🗂 Estrutura do projeto

```
sublime/
├── app/                        # Páginas (App Router)
│   ├── layout.jsx              # Layout raiz com providers
│   ├── globals.css             # Design tokens e estilos globais
│   ├── page.jsx                # 🛍 Loja principal
│   ├── checkout/page.jsx       # 💳 Finalizar pagamento (4 etapas)
│   ├── compras/page.jsx        # 📦 Rastrear pedidos
│   └── whatsapp/page.jsx       # 💬 Reservar via WhatsApp
│
├── components/
│   ├── cart/CartSidebar.jsx    # Carrinho lateral
│   ├── checkout/               # Stepper, resumo, modal de sucesso
│   ├── icons/                  # SVGs animados (check, package, banknotes)
│   ├── layout/                 # Header, Footer, SideMenu
│   ├── store/                  # Carousel, ProductCard, FilterSidebar, VariationsModal
│   └── ui/ToastContainer.jsx   # Sistema de notificações
│
├── context/
│   ├── CartContext.jsx         # Estado global do carrinho (localStorage)
│   └── ToastContext.jsx        # Sistema de toasts
│
├── lib/
│   ├── config.js               # ⚙️ CONFIGURAÇÕES (URLs, preços, origem)
│   ├── api.js                  # Chamadas à API (Worker + GAS + ViaCEP)
│   └── utils.js                # Funções utilitárias
│
└── public/
    ├── imagensprodutos/        # ← Coloque as imagens dos produtos aqui
    ├── imagenscarrossel/       # ← Coloque as imagens do carrossel aqui
    └── image/                  # ← Outros assets
```

## 🖼 Imagens

Copie suas pastas de imagens para `public/`:

```bash
cp -r /caminho/original/imagensprodutos  public/
cp -r /caminho/original/imagenscarrossel public/
cp -r /caminho/original/image            public/
```

## ⚙️ Configurações em `lib/config.js`

| Campo | Descrição |
|-------|-----------|
| `API.WORKER_URL` | URL do Cloudflare Worker |
| `API.GAS_URL` | URL do Google Apps Script |
| `API.WHATSAPP_NUMBER` | Número WhatsApp (com código do país) |
| `API.PIX_KEY` | Chave PIX |
| `STORE.DISCOUNT_PERCENT` | Desconto global (0 = sem desconto) |
| `ORIGIN.*` | Endereço de retirada |
| `SHIPPING_TIERS` | Tabela de fretes por subtotal |
| `INSTALLMENT_FEES` | Taxas de parcelamento |

## 🎨 SVGs criados para o projeto

- **`CheckSuccessAnimation`** — Animação de checkmark verde ao concluir pedido (substitui o GIF)
- **`PackageSearchIcon`** — Caixa com pin de localização + lupa (hero da página de rastreio)
- **`BanknotesIcon`** — Ícone de cédulas para o método de pagamento Dinheiro

## 🛠 Stack

- **Next.js 14** (App Router, Client Components onde necessário)
- **React 18** com Context API para estado global
- **CSS Modules** para estilos encapsulados por componente
- **Zero dependências externas de UI** — apenas Next.js + React

## 📱 Funcionalidades

- ✅ Catálogo de produtos com agrupamento por variações
- ✅ Filtros por linha, capacidade, busca e faixa de preço
- ✅ Carrossel automático de banners
- ✅ Carrinho lateral com persistência em localStorage
- ✅ Checkout em 4 etapas com validação
- ✅ Cálculo de frete por geolocalização (Nominatim)
- ✅ Busca de CEP (ViaCEP)
- ✅ Suporte a PIX, Dinheiro e Cartão de Crédito com parcelamento
- ✅ Sistema de cupons de desconto
- ✅ Rastreamento de pedidos por CPF ou VD
- ✅ Integração WhatsApp
- ✅ Toasts de notificação
- ✅ Totalmente responsivo (mobile-first)
