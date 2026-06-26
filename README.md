# 🛍️ Sublime — Plataforma de E-commerce para Tupperware

Uma loja virtual moderna, rápida e escalável desenvolvida com **Next.js 15**, **React 19** e **PostgreSQL**.

![Status](https://img.shields.io/badge/Status-Production%20Ready-green)
![Next.js](https://img.shields.io/badge/Next.js-15.5.18-black)
![React](https://img.shields.io/badge/React-19-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6)
![License](https://img.shields.io/badge/License-Proprietary-red)

---

## 📋 Visão Geral

**Sublime** é uma solução completa de e-commerce para comercialização de produtos Tupperware com funcionalidades modernas:

- ✅ **Catálogo dinâmico** com filtros avançados por linha, capacidade e preço
- ✅ **Carrinho persistente** com sincronização em localStorage
- ✅ **Checkout em 4 etapas** com validação de dados e cálculo de frete
- ✅ **Múltiplos métodos de pagamento**: PIX, Dinheiro, Cartão com parcelamento até 12x
- ✅ **Sistema de cupons** com desconto e frete grátis
- ✅ **Rastreamento de pedidos** por ID ou CPF
- ✅ **Painel administrativo** para gestão de produtos, cupons e pedidos
- ✅ **Upload de imagens** integrado com Cloudinary
- ✅ **Cálculo automático de frete** com geolocalização
- ✅ **Design responsivo** otimizado para mobile

---

## 🚀 Quick Start

### Pré-requisitos

- **Node.js** 18+ instalado
- **npm** ou **yarn**
- Acesso a um banco **PostgreSQL** (ou Neon serverless)
- Conta **Cloudinary** (para upload de imagens)

### Instalação Local

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/sublime.git
cd sublime

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env.local

# 4. Popule as variáveis (veja seção abaixo)
# ...

# 5. Execute migrations do banco
npx prisma migrate deploy
npx prisma generate

# 6. Inicie o servidor de desenvolvimento
npm run dev

# 7. Abra no browser
# http://localhost:3000
```

### Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```bash
# ──── BANCO DE DADOS ────────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@host:port/database"

# ──── AUTENTICAÇÃO ──────────────────────────────────────────────────
JWT_SECRET="seu_secret_super_secreto_com_minimo_32_caracteres"

# ──── CLOUDINARY (Upload de Imagens) ────────────────────────────────
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="seu_cloud_name"
CLOUDINARY_API_KEY="sua_chave_api"
CLOUDINARY_API_SECRET="seu_segredo_api"

# ──── PAINEL ADMINISTRATIVO ─────────────────────────────────────────
DASHBOARD_ORIGIN="https://seu-dashboard.com"  # CORS allowlist

# ──── VERCEL (Deployment) ──────────────────────────────────────────
NEXT_PUBLIC_VERCEL_URL="https://seu-projeto.vercel.app"
```

> **⚠️ Importante**: Nunca commite `.env.local` no repositório. Use `.env.example` como template.

---

## 📦 Build & Deployment

### Build para Produção

```bash
# Compila Next.js + gera Prisma client
npm run build

# Inicia o servidor em modo produção
npm start
```

### Deploy no Vercel

1. **Faça push no GitHub**:
   ```bash
   git push origin main
   ```

2. **Acesse [vercel.com](https://vercel.com)**:
   - Clique em **"New Project"**
   - Importe o repositório
   - Vercel detecta automaticamente que é Next.js
   - Configure as variáveis de ambiente
   - Clique em **"Deploy"**

3. **Após o deploy**:
   ```bash
   # Cada push em main fará deploy automático
   # Vercel oferece preview URLs para PRs
   ```

> **Dica**: Configure **automatic deployments** nas settings do Vercel.

---

## 📂 Estrutura do Projeto

```
sublime/
├── app/                          # Next.js App Router
│   ├── layout.jsx                # Layout raiz com Context Providers
│   ├── globals.css               # Design tokens & estilos globais
│   ├── page.jsx                  # Loja principal (homepage)
│   │
│   ├── api/                      # Endpoints REST
│   │   ├── auth/                 # Autenticação (login/logout/me)
│   │   ├── estoque/              # Produtos (CRUD)
│   │   ├── pedidos/              # Pedidos (criar, rastrear, listar)
│   │   ├── cupons/               # Cupons (validar, consumir)
│   │   ├── clientes/             # Clientes (CRUD)
│   │   ├── usuarios/             # Usuários admin (CRUD)
│   │   └── upload/               # Upload de imagens
│   │
│   ├── checkout/page.jsx         # Página de checkout (4 etapas)
│   ├── compras/page.jsx          # Rastreamento de pedidos
│   └── whatsapp/page.jsx         # Reserva via WhatsApp
│
├── components/                   # Componentes React reutilizáveis
│   ├── cart/                     # CartSidebar (carrinho lateral)
│   ├── checkout/                 # Stepper, OrderSummary, SuccessModal
│   ├── icons/                    # SVGs animados (Check, Package, Banknotes)
│   ├── layout/                   # Header, Footer, SideMenu
│   ├── store/                    # ProductCard, Carousel, FilterSidebar, etc
│   └── ui/                       # ToastContainer (notificações)
│
├── context/                      # Context API para estado global
│   ├── CartContext.jsx           # Estado do carrinho
│   ├── ConfigContext.jsx         # Configurações da loja
│   └── ToastContext.jsx          # Sistema de notificações
│
├── lib/                          # Utilitários e configurações
│   ├── config.js                 # Constantes da aplicação
│   ├── api.js                    # Client API (fetch wrappers)
│   ├── utils.js                  # Funções utilitárias
│   ├── jwt.ts                    # Criação/verificação de JWT
│   ├── cors.ts                   # Configuração de CORS
│   ├── prisma.ts                 # Client Prisma
│   ├── middleware.ts             # Middlewares (autenticação)
│   └── cloudinary.ts             # Upload com Cloudinary
│
├── prisma/                       # Banco de dados (Prisma ORM)
│   ├── schema.prisma             # Schema do banco
│   ├── migrations/               # Histórico de alterações
│   └── seed.ts                   # Dados iniciais (seed)
│
├── public/                       # Assets estáticos
│   ├── imagens_produtos/         # Imagens dos produtos
│   ├── imagens_carrossel/        # Banners do carrossel
│   └── logo/                     # Logo e ícones
│
├── historia/                     # Documentação do projeto
│   ├── ARQUITETURA.md            # Diagrama da arquitetura
│   ├── ENDPOINTS.md              # Referência de APIs
│   ├── TROUBLESHOOTING.md        # Resolução de problemas
│   └── README.md                 # Documentação completa
│
└── Documentação/                 # Documentação para customização
    ├── 1-README-GitHub.md        # Este arquivo
    ├── 2-CUSTOMIZACAO.md         # Guia de customização
    └── 3-VULNERABILIDADES.md     # Análise de segurança
```

---

## 🛠️ Stack Tecnológico

### Frontend
- **Next.js 15.5.18** — Framework React com SSR/SSG
- **React 19** — Biblioteca UI
- **CSS Modules** — Estilos encapsulados por componente
- **Context API** — Gerenciamento de estado global
- **Zod** — Validação de schemas

### Backend
- **Next.js API Routes** — Endpoints REST com TypeScript
- **Prisma 7.8.0** — ORM type-safe para banco de dados
- **JWT (jose)** — Autenticação stateless
- **bcryptjs** — Hashing de senhas
- **CORS** — Controle de requisições cross-origin

### Infraestrutura
- **PostgreSQL 14+** — Banco de dados relacional
- **Neon** — PostgreSQL serverless com connection pooling
- **Cloudinary** — Storage e transformação de imagens
- **Vercel** — Deployment e CDN
- **OSM/ViaCEP** — Geocoding e busca de CEP

---

## 🎨 Tecnologias sem Dependências Externas

O projeto **não usa bibliotecas de UI** (como Material-UI, Bootstrap, etc). Todos os componentes são **CSS Modules puro** com designs customizados:

- ✅ Maior controle visual
- ✅ Menor bundle size
- ✅ Melhor performance
- ✅ Design único e diferenciado

---

## 📊 Modelos de Dados

### Principais Tabelas

| Tabela | Descrição |
|--------|-----------|
| **Estoque** | Produtos (qtd, preço, cores, linha, imagem) |
| **Pedido** | Pedidos realizados (itens, status, pagamento) |
| **Cupom** | Códigos promocionais com desconto/frete grátis |
| **Cliente** | Dados de clientes (CPF, nome, contato, endereços) |
| **Usuario** | Usuários admin (email, senha, permissões) |
| **Config** | Configurações da loja (key-value) |
| **FreteConfig** | Tabelas de frete (VALOR/KM/FIXO/CIDADE) |

---

## 🔐 Segurança

O projeto implementa várias camadas de proteção:

- ✅ **JWT com expiração de 7 dias** para autenticação
- ✅ **Senhas com bcryptjs** (hashing + salt)
- ✅ **Rate limiting no login** (10 tentativas/15 minutos)
- ✅ **Timing attack prevention** em autenticação
- ✅ **Validação com Zod** em todos os endpoints
- ✅ **CORS configurado** para domínios específicos
- ✅ **Transações atômicas** no banco para evitar stock leaks
- ✅ **Input sanitization** em CPF, telefone, email

> ⚠️ **Veja [3-VULNERABILIDADES.md](./3-VULNERABILIDADES.md) para análise detalhada de segurança**

---

## 🎯 Funcionalidades Principais

### 1. Catálogo de Produtos
- Listagem com filtros avançados (linha, capacidade, faixa de preço)
- Agrupamento por variações de cores
- Busca full-text
- Carrossel de banners

### 2. Carrinho de Compras
- Persistência com localStorage
- Atualização em tempo real
- Validação de estoque
- Sidebar animada

### 3. Checkout em 4 Etapas
1. **Dados Pessoais** — Nome, CPF, contato
2. **Entrega** — Endereço ou retirada local
3. **Pagamento** — Método, parcelas, cupom
4. **Confirmação** — Revisão e resumo

### 4. Cálculo de Frete
- Geolocalização automática do CEP
- Tabelas escalonadas por valor
- Cupons com frete grátis
- Suporte a múltiplos modelos (VALOR/KM/FIXO/CIDADE)

### 5. Rastreamento de Pedidos
- Por ID único (VD-XXXXX)
- Por CPF + Telefone
- Status em tempo real (Reservado → Entregue)
- Timeline de eventos

### 6. Painel Administrativo
- Gestão de produtos (criar, editar, deletar)
- Gestão de cupons (criar, validar, consumir)
- Listagem de pedidos com filtros
- Controle de usuários e permissões

---

## 📋 Estados de Pedido

```
RESERVADO → CONFIRMADO → EM_PREPARO → SAIU_PARA_ENTREGA → ENTREGUE
                                                       ↘
                                                    CANCELADO
```

---

## 💳 Métodos de Pagamento

| Método | Descrição | Parcelamento |
|--------|-----------|--------------|
| **PIX** | Pagamento instantâneo | Não |
| **Dinheiro** | Entrega com dinheiro | Não |
| **Cartão de Crédito** | Processamento online | Até 12x com juros |

> As taxas de parcelamento são configuráveis em `lib/config.js`

---

## 📱 Linhas de Produtos (Tupperware)

O projeto suporta 6 categorias principais:

1. **FREEZER** — Containers para congelador
2. **AQUECER** — Produtos seguros para microondas
3. **CONSERVAR** — Potes para armazenagem
4. **PREPARAR** — Utensílios de preparo
5. **SERVIR** — Louça para servir
6. **ARMAZENAR** — Caixas e organizadores

> Customize em `prisma/schema.prisma` (enum `Linha`)

---

## 🚨 Troubleshooting

Para problemas comuns, consulte [historia/TROUBLESHOOTING.md](../historia/TROUBLESHOOTING.md)

Tópicos cobertos:
- Erro de conexão com Prisma
- Imagens não carregam do Cloudinary
- JWT inválido
- Porta 3000 já em uso
- E mais...

---

## 📚 Documentação Adicional

| Arquivo | Conteúdo |
|---------|----------|
| [historia/ARQUITETURA.md](../historia/ARQUITETURA.md) | Diagrama e visão técnica da arquitetura |
| [historia/ENDPOINTS.md](../historia/ENDPOINTS.md) | Referência completa de endpoints REST |
| [Documentação/2-CUSTOMIZACAO.md](./2-CUSTOMIZACAO.md) | Guia de customização para outro cliente |
| [Documentação/3-VULNERABILIDADES.md](./3-VULNERABILIDADES.md) | Análise de segurança e más-práticas |

---

## 🤝 Contribuindo

Para contribuir com melhorias:

1. Crie uma branch: `git checkout -b feature/sua-feature`
2. Commit suas mudanças: `git commit -m "feat: descrição"`
3. Push para a branch: `git push origin feature/sua-feature`
4. Abra um Pull Request

---

## 📝 Licença

Este projeto é **proprietário** e confidencial. Todos os direitos reservados.

---

## 📞 Suporte

Para dúvidas ou problemas:

- 📧 Email: gab.oliveirab27@gmail.com
- 💬 WhatsApp: [Clique aqui](https://wa.me/5588988568911)
- 🐛 Issues: [GitHub Issues](https://github.com/Gabriel-Oliveira27/sublime/issues)

---

**Última atualização**: 2 de junho de 2026  
**Versão**: 4.0.0  
**Status**: Production Ready ✅
