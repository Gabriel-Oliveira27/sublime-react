# 📑 ÍNDICE RÁPIDO - SUBLIME

Bem-vindo! Use este guia para navegar pela documentação completa do projeto.

---

## 🚀 Comece Aqui

- **Novo no projeto?** → [Visão Geral](./README.md#-visão-geral)
- **Setup local?** → [Setup e Deploy](./README.md#-setup-e-deploy)
- **Entender arquitetura?** → [Arquitetura](./README.md#-arquitetura-do-projeto)

---

## 📚 Documentação por Tópico

### 🎯 Produto & Negócio
- [Funcionalidades Principais](./README.md#-funcionalidades-principais) - O que o app faz
- [Stack de Tecnologia](./README.md#-stack-de-tecnologia) - Ferramentas usadas
- [Modelos de Banco](./README.md#-modelos-de-banco-de-dados) - Estrutura de dados
- [Fluxos de Negócio](./README.md#-fluxos-de-negócio) - Jornadas do usuário

### 💻 Desenvolvimento
- [API Endpoints](./README.md#-api-endpoints) - Todas as rotas (25+)
- [Componentes de UI](./README.md#-componentes-de-ui) - React components
- [Gerenciamento de Estado](./README.md#-gerenciamento-de-estado) - Context API
- [Autenticação & Autorização](./README.md#-autenticação--autorização) - JWT + Permissões

### 🔌 Integrações
- [Cloudinary](./README.md#-cloudinary) - Upload de imagens
- [ViaCEP](./README.md#-viacep) - Consulta de CEP
- [OpenStreetMap](./README.md#-openstreetmap-nominatim) - Geocodificação
- [Neon Database](./README.md#-neon-database) - PostgreSQL serverless
- [Prisma ORM](./README.md#-prisma-orm) - ORM + Migrações

### 🚀 Deploy
- [Setup Local](./README.md#-setup-local)
- [Vercel](./README.md#-deploy-no-vercel)
- [Neon DB](./README.md#-deploy-do-banco-neon)
- [Troubleshooting](./README.md#-troubleshooting)

---

## 🗂️ Estrutura de Arquivos

```
sublime/
├── app/                    # Next.js App Router
│   ├── page.jsx           # 🛍️ Loja (catálogo)
│   ├── checkout/          # 💳 Checkout 4 etapas
│   ├── compras/           # 📦 Rastreamento
│   └── api/               # 🔌 APIs REST (25+ rotas)
│
├── components/            # React components (15+)
│   ├── store/             # Catálogo e filtros
│   ├── checkout/          # Fluxo de checkout
│   ├── cart/              # Carrinho
│   ├── layout/            # Header, Footer
│   └── icons/             # SVGs
│
├── context/               # Estado Global
│   ├── CartContext.jsx    # Carrinho + localStorage
│   └── ToastContext.jsx   # Notificações
│
├── lib/                   # Utilitários
│   ├── api.js             # Cliente HTTP
│   ├── prisma.ts          # Instância ORM
│   ├── jwt.ts             # Auth functions
│   ├── cloudinary.ts      # Upload
│   └── utils.js           # Helpers
│
├── prisma/                # Banco de dados
│   ├── schema.prisma      # Modelos (6 models)
│   └── migrations/        # Histórico
│
├── historia/              # 📚 Documentação
│   ├── README.md          # VOCÊ ESTÁ AQUI
│   ├── INDEX.md           # Este arquivo
│   ├── ENDPOINTS.md       # API ref rápida
│   ├── ARQUITETURA.md     # Diagramas
│   └── TROUBLESHOOTING.md # Soluções
│
└── public/                # Assets
    ├── imagens_produtos/
    ├── imagens_carrossel/
    └── logo/
```

---

## 🎯 Guias Rápidos por Persona

### 👨‍💻 Desenvolvedor Frontend
1. Leia: [Componentes de UI](./README.md#-componentes-de-ui)
2. Estude: [CartContext](./README.md#cartcontextjsx) + [ToastContext](./README.md#toastcontextjsx)
3. Explore: `components/` - comece por `ProductCard.jsx`
4. Teste: `npm run dev` na porta 3000

### 👨‍💻 Desenvolvedor Backend
1. Leia: [API Endpoints](./README.md#-api-endpoints) completo
2. Estude: [Modelos de Banco](./README.md#-modelos-de-banco-de-dados)
3. Explore: `app/api/` - comece por `/estoque/route.ts`
4. Entenda: [Autenticação](./README.md#-autenticação--autorização)

### 🔧 DevOps / Infraestrutura
1. Leia: [Setup e Deploy](./README.md#-setup-e-deploy)
2. Configure: Neon + Vercel
3. Adicione: Variáveis de ambiente
4. Deploy: `git push origin main`

### 👔 Product Manager
1. Leia: [Funcionalidades Principais](./README.md#-funcionalidades-principais)
2. Estude: [Fluxos de Negócio](./README.md#-fluxos-de-negócio)
3. Entenda: [Modelos](./README.md#-modelos-de-banco-de-dados)
4. Roadmap: [Changelog](./README.md#-changelog)

---

## 🔍 Buscar por Funcionalidade

### 🛍️ Catálogo de Produtos
- Componentes: [ProductCard](./README.md#productcardjsx), [FilterSidebar](./README.md#filtersidebajsx)
- API: [GET /api/estoque](./README.md#get-apiestoque)
- Backend: `app/api/estoque/route.ts`

### 🛒 Carrinho
- Context: [CartContext](./README.md#cartcontextjsx)
- Componente: [CartSidebar](./README.md#cartsidebajsx)
- Hook: `const { items, add, remove } = useCart()`

### 💳 Checkout
- Componentes: [StepIndicator](./README.md#stepindicatorjsx), [OrderSummary](./README.md#ordersummaryjsx)
- Fluxo: [4 Etapas](./README.md#💳-checkout-em-4-etapas)
- API: [POST /api/pedidos](./README.md#post-apipedidos)

### 📦 Rastreamento
- Página: `/compras`
- API: [GET /api/pedidos/rastrear](./README.md#get-apipedidosrastrear)
- Busca: ID (VD-001) ou CPF + Telefone

### 🎁 Cupons
- API: [GET/POST /api/cupons](./README.md#-cupons)
- Validação: [GET /api/cupons/validar](./README.md#get-apicuponsvalidar)
- Context: Integrado em `OrderSummary`

### 🔐 Admin
- Login: [POST /api/auth/login](./README.md#autenticação)
- Painel: `/admin` (requer JWT + isAdmin)
- Permissões: [Estrutura](./README.md#permissões-granulares)

---

## 📊 Números Importantes

| Métrica | Valor |
|---------|-------|
| **Componentes React** | 15+ |
| **API Endpoints** | 25+ |
| **Modelos de Banco** | 6 |
| **Enums de Status** | 6+ |
| **Métodos de Pagamento** | 3 |
| **Parcelamento** | Até 12x |
| **Tiers de Frete** | 6 |
| **Linhas de Produto** | 6 |

---

## 🚀 Começar Desenvolvimento Agora

```bash
# 1. Clone
git clone <repo> && cd sublime

# 2. Instale
npm install

# 3. Configure
cp .env.example .env.local
# Preencha DATABASE_URL, JWT_SECRET, CLOUDINARY_*

# 4. Setup DB
npx prisma migrate dev

# 5. Rode
npm run dev

# 6. Acesse
# Loja: http://localhost:3000
# Docs: ./historia/README.md
```

---

## ❓ FAQ Rápido

**P: Como adicionar um novo produto?**  
R: POST `/api/estoque` ou admin panel `/admin/estoque`

**P: Como criar um cupom de desconto?**  
R: POST `/api/cupons` com `cupom`, `desconto`, `quantidadeUsos`

**P: Como rastrear um pedido?**  
R: GET `/api/pedidos/rastrear?id=VD-001` ou `?cpf=XXX&phone=XXX`

**P: Como fazer login como admin?**  
R: POST `/api/auth/login` com `email` + `senha`, receba JWT

**P: Qual é o limite de imagens no Cloudinary?**  
R: Plan free = 25GB armazenado (geralmente ok para e-commerce pequeno)

**P: Como resetar o servidor TypeScript?**  
R: `rm -rf .next && npm run dev`

---

## 🔗 Links Úteis

- 📖 [README Principal](./README.md)
- 🔌 [Endpoints Rápida](./ENDPOINTS.md) (próximo arquivo)
- 🏗️ [Arquitetura](./ARQUITETURA.md) (próximo arquivo)
- 🆘 [Troubleshooting](./TROUBLESHOOTING.md) (próximo arquivo)

---

## 📞 Suporte

- Dúvidas? Veja [README.md](./README.md)
- Erro? Procure em [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Documentação incompleta? Abra issue no GitHub

---

**Última atualização**: 25 maio 2026  
**Versão**: 1.0.0
