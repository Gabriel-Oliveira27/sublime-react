# 📚 DOCUMENTAÇÃO COMPLETA DO PROJETO SUBLIME

**Data**: 25 de maio de 2026  
**Versão**: 1.0.0  
**Status**: Produção  

---

## 📖 Índice

1. [Visão Geral](#-visão-geral)
2. [Stack de Tecnologia](#-stack-de-tecnologia)
3. [Arquitetura do Projeto](#-arquitetura-do-projeto)
4. [Funcionalidades Principais](#-funcionalidades-principais)
5. [Modelos de Banco de Dados](#-modelos-de-banco-de-dados)
6. [API Endpoints](#-api-endpoints)
7. [Componentes de UI](#-componentes-de-ui)
8. [Gerenciamento de Estado](#-gerenciamento-de-estado)
9. [Autenticação & Autorização](#-autenticação--autorização)
10. [Integrações com Terceiros](#-integrações-com-terceiros)
11. [Fluxos de Negócio](#-fluxos-de-negócio)
12. [Setup e Deploy](#-setup-e-deploy)

---

## 🎯 Visão Geral

**Sublime** é uma plataforma moderna de **e-commerce para produtos Tupperware**, desenvolvida com **Next.js 14** e mirada para escalabilidade, segurança e experiência do usuário.

### O que é?

Uma loja virtual completa com:
- 🛍️ **Catálogo dinâmico** com filtros avançados
- 🛒 **Carrinho persistente** com localStorage
- 💳 **Checkout em 4 etapas** com validação
- 📦 **Rastreamento de pedidos** por ID ou CPF
- 💰 **Múltiplos métodos de pagamento** (PIX, Dinheiro, Cartão)
- 🎁 **Sistema de cupons** com desconto e frete grátis
- 📊 **Painel administrativo** para gestão
- 🖼️ **Upload de imagens** integrado com Cloudinary
- 🗺️ **Cálculo de frete** com geolocalização

### Números

| Métrica | Valor |
|---------|-------|
| **Linhas de Produtos** | 6 categorias |
| **Estados de Pedido** | 6 estados |
| **Métodos de Pagamento** | 3 (PIX, Dinheiro, Cartão) |
| **Parcelamento** | Até 12x |
| **Tiers de Frete** | 6 escalonados |
| **Componentes React** | 15+ reutilizáveis |
| **Endpoints API** | 25+ rotas |

---

## 🛠️ Stack de Tecnologia

### 🎨 **Frontend**
```
Next.js 15.5.18 (App Router)
    ├─ React 19
    ├─ JavaScript/JSX
    ├─ CSS Modules
    ├─ Context API (State Management)
    └─ Zod (Validação)
```

**Recursos**:
- SSR (Server-Side Rendering) para SEO
- Otimização de imagens automática
- Code splitting e lazy loading
- Middleware de autenticação

### 🔧 **Backend**
```
Next.js API Routes (TypeScript)
    ├─ Zod (Schema Validation)
    ├─ JWT (jose library)
    ├─ bcryptjs (Password Hashing)
    └─ CORS habilitado
```

**Recursos**:
- Rotas RESTful em `app/api/`
- Validação em dois níveis
- Transações atômicas com Prisma
- Middleware de autenticação

### 💾 **Banco de Dados**
```
PostgreSQL via Neon (Serverless)
    ├─ Prisma ORM 7.8.0
    ├─ Adapter Neon (@prisma/adapter-neon)
    ├─ Migrations automáticas
    └─ Connection pooling
```

**Recursos**:
- Schema-first development
- Type-safe queries
- Soft deletes com `ativo` flag
- Seed de dados com CSV

### 🔐 **Segurança**
```
JWT (7 dias)
    ├─ bcryptjs (rounds: 10)
    ├─ Cookies HttpOnly
    ├─ Validação Zod backend
    └─ CORS whitelist
```

### 🔗 **Integrações**
```
Cloudinary       → Upload e armazenamento de imagens
OpenStreetMap    → Geocodificação de endereços
ViaCEP           → Consulta de CEP brasileiro
Neon Database    → Hosting PostgreSQL
Vercel           → Deploy e CI/CD
```

---

## 🏗️ Arquitetura do Projeto

### Estrutura de Pastas

```
sublime/
├── app/                          # Next.js App Router
│   ├── layout.jsx               # Root layout com Context Providers
│   ├── page.jsx                 # Homepage (Catálogo)
│   ├── globals.css              # Estilos globais
│   │
│   ├── api/                     # APIs REST
│   │   ├── auth/
│   │   │   ├── login/           # POST: Login com JWT
│   │   │   ├── logout/          # POST: Logout
│   │   │   └── me/              # GET: Dados do usuário
│   │   │
│   │   ├── estoque/             # Gestão de Produtos
│   │   │   ├── route.ts         # GET/POST produtos
│   │   │   └── [id]/            # GET/PATCH/DELETE produto
│   │   │
│   │   ├── pedidos/             # Gestão de Pedidos
│   │   │   ├── route.ts         # GET/POST pedidos
│   │   │   ├── [id]/            # GET/PATCH pedido
│   │   │   └── rastrear/        # GET rastreamento
│   │   │
│   │   ├── cupons/              # Gestão de Cupons
│   │   │   ├── route.ts         # GET/POST cupons
│   │   │   ├── validar/         # GET valida cupom
│   │   │   └── consumir/        # POST decrementa uso
│   │   │
│   │   ├── usuarios/            # Gestão de Usuários (Admin)
│   │   │   ├── route.ts         # GET/POST usuários
│   │   │   └── [id]/            # GET/PATCH/DELETE usuário
│   │   │
│   │   ├── config/              # Configurações
│   │   │   ├── pix/             # GET/PATCH chave PIX
│   │   │   └── vendas/          # GET/POST config vendas
│   │   │
│   │   ├── upload/              # Upload Cloudinary
│   │   └── debug/               # Debug info
│   │
│   ├── checkout/                # Página de Checkout
│   ├── compras/                 # Rastreamento de Pedidos
│   ├── estoque/                 # Gestão de Estoque (Admin)
│   └── whatsapp/                # Integração WhatsApp
│
├── components/                  # React Components
│   ├── cart/
│   │   ├── CartSidebar.jsx      # Sidebar do carrinho
│   │   └── CartSidebar.module.css
│   │
│   ├── checkout/
│   │   ├── OrderSummary.jsx     # Resumo do pedido
│   │   ├── StepIndicator.jsx    # 4 etapas do checkout
│   │   ├── SuccessModal.jsx     # Modal de sucesso
│   │   └── *.module.css
│   │
│   ├── store/
│   │   ├── Carousel.jsx         # Carrossel de banners
│   │   ├── ProductCard.jsx      # Card de produto
│   │   ├── FilterSidebar.jsx    # Filtros (linha, preço, etc)
│   │   ├── VariationsModal.jsx  # Modal de escolher cor/capacidade
│   │   └── *.module.css
│   │
│   ├── layout/
│   │   ├── Header.jsx           # Header com search
│   │   ├── Footer.jsx           # Footer
│   │   ├── SideMenu.jsx         # Menu lateral mobile
│   │   └── *.module.css
│   │
│   ├── icons/
│   │   ├── Icons.jsx            # SVG reutilizáveis
│   │   ├── CheckSuccessAnimation.jsx
│   │   ├── PackageSearchIcon.jsx
│   │   └── BanknotesIcon.jsx
│   │
│   └── ui/
│       ├── ToastContainer.jsx   # Sistema de notificações
│       └── ToastContainer.module.css
│
├── context/                     # React Context
│   ├── CartContext.jsx          # Estado global do carrinho
│   └── ToastContext.jsx         # Sistema de toasts
│
├── lib/                         # Utilitários e Libs
│   ├── api.js                   # Cliente HTTP (fetch wrapper)
│   ├── config.js                # Configurações globais
│   ├── cloudinary.ts            # Cliente Cloudinary
│   ├── jwt.ts                   # Funções JWT
│   ├── middleware.ts            # Autenticação middleware
│   ├── prisma.ts                # Instância Prisma singleton
│   ├── utils.js                 # Funções helper
│   └── generated/
│       └── prisma/              # Tipos gerados
│
├── prisma/
│   ├── schema.prisma            # Modelos de banco
│   ├── migrations/              # Histórico de mudanças
│   └── seed-data/               # Dados iniciais (CSV)
│
├── public/
│   ├── imagens_produtos/        # Imagens dos produtos
│   ├── imagens_carrossel/       # Banners do carrossel
│   └── logo/                    # Logos e favicons
│
└── scripts/                     # Utilitários CLI
    └── test-cloudinary.ts
```

### Fluxo de Dados

```
Usuário na Browser
    ↓
Next.js App Router (page.jsx)
    ↓
RootLayout (layout.jsx)
    ├─ CartProvider (localStorage sync)
    ├─ ToastProvider
    └─ Content
        ├─ Header (consome CartContext)
        ├─ Main Page (consome ambos)
        └─ Footer
    ↓
API Routes (app/api/*)
    ├─ Middleware de autenticação (se protegido)
    ├─ Validação com Zod
    ├─ Prisma queries
    └─ Response JSON
    ↓
Banco de Dados (PostgreSQL)
```

---

## ⚙️ Funcionalidades Principais

### 1. 🛍️ **Catálogo de Produtos**

**Características**:
- Exibição em grid responsivo
- Filtros por:
  - 📏 **Linha**: FREEZER, AQUECER, CONSERVAR, PREPARAR, SERVIR, ARMAZENAR
  - 🎨 **Cor**: Todas as disponíveis
  - 💧 **Capacidade (litros)**: Agrupamento automático
  - 💰 **Faixa de preço**: 0-50, 50-100, 100-200, 200+
  - 🔍 **Busca textual**: Produto e cores
- **Agrupamento inteligente**: Variações por capacidade em modais
- **Desconto global**: Aplicado automaticamente (CONFIG.STORE.DISCOUNT_PERCENT)
- **Stock visual**: Cores de disponibilidade (verde, amarelo, vermelho)

**Endpoints**:
```
GET /api/estoque              # Lista todos (público)
POST /api/estoque             # Criar (admin)
GET /api/estoque/[id]         # Detalhe (público)
PATCH /api/estoque/[id]       # Atualizar (admin)
DELETE /api/estoque/[id]      # Deletar (admin)
```

### 2. 🛒 **Carrinho de Compras**

**Características**:
- Persistência em localStorage com chave `sublime_cart`
- Sidebar flutuante (mobile-friendly)
- Cálculo automático:
  - Subtotal (qtd × preço)
  - Frete (calculado na etapa 2)
  - Desconto (cupom ou percentual global)
  - **Total = Subtotal + Frete - Desconto**
- Limpar carrinho com confirmação
- Badge com quantidade no header
- Sincronização cross-tab

**Estado Redux-like**:
```javascript
{
  items: [
    {
      id,              // ID do produto
      descricao,       // Nome do produto
      cores,           // Cor escolhida
      imagem,          // URL
      quantidade,      // Qty no carrinho
      valor,           // Preço unitário
      valorOriginal    // Preço sem desconto
    }
  ],
  sidebarOpen: boolean,
  error: null | string
}
```

**Ações**:
- `ADD`: Adiciona novo item ou incrementa qty
- `REMOVE`: Remove item completamente
- `UPDATE_QTY`: Altera quantidade
- `CLEAR`: Limpa todos os itens
- `TOGGLE_SIDEBAR`: Abre/fecha sidebar

### 3. 💳 **Checkout em 4 Etapas**

#### **Etapa 1: Dados Pessoais**
```
┌─────────────────────────────┐
│ Nome Completo *             │
│ Telefone (com máscara) *    │
│ CPF (opcional)              │
│                             │
│ [Próximo] [Carrinho]        │
└─────────────────────────────┘
```

**Validações**:
- Nome: mínimo 3 caracteres
- Telefone: (XX) 9XXXX-XXXX (com máscara)
- CPF: Se informado, validação mod 11

#### **Etapa 2: Entrega**
```
┌─────────────────────────────┐
│ ☐ Retirada  ☑ Entrega      │
│                             │
│ CEP * (se entrega)          │
│ ↓ Auto-preenche com ViaCEP  │
│ Rua, Cidade, Estado         │
│                             │
│ Se Retirada:                │
│ Quem retira, Data, Hora     │
│                             │
│ Frete: R$ X,XX (calculado)  │
│ ⚠️ Aviso se cidade ≠ origem │
│                             │
│ [Próximo] [Voltar]          │
└─────────────────────────────┘
```

**Cálculo de Frete** (6 tiers):
```javascript
if (subtotal <= 100)      frete = 15.00
else if (subtotal <= 200) frete = 12.00
else if (subtotal <= 300) frete = 10.00
else if (subtotal <= 500) frete = 8.00
else if (subtotal <= 1000) frete = 5.00
else                       frete = 0.00 // Grátis acima de 1k
```

#### **Etapa 3: Pagamento**
```
┌─────────────────────────────┐
│ Método de Pagamento:        │
│                             │
│ ☑ PIX                       │
│ ☐ Dinheiro                  │
│ ☐ Cartão de Crédito         │
│                             │
│ Se Dinheiro:                │
│ Troco para: R$ ____         │
│ ↓ Cálcula automaticamente    │
│ Valor a levar: R$ X,XX      │
│                             │
│ Se Crédito:                 │
│ Parcelamento: 1x a 12x      │
│ Valor parcela: R$ X,XX      │
│                             │
│ [Próximo] [Voltar]          │
└─────────────────────────────┘
```

**Parcelamento** (com juros):
```javascript
1x  → 0% (à vista)
2x  → 2.5% ao mês
3x  → 3% ao mês
...
12x → 5% ao mês
```

#### **Etapa 4: Resumo & Confirmação**
```
┌─────────────────────────────┐
│ Resumo do Pedido:           │
│                             │
│ Itens:                      │
│  • Produto A × 2 ... R$ XX  │
│  • Produto B × 1 ... R$ XX  │
│                             │
│ Subtotal: R$ XXX,XX         │
│ Frete: R$ XX,XX             │
│ Desconto Cupom: -R$ XX,XX   │
│ ─────────────────────────── │
│ TOTAL: R$ XXX,XX            │
│                             │
│ Cupom (opcional):           │
│ [PROMO10] [Aplicar]         │
│                             │
│ [Confirmar Pedido]          │
│ [Voltar]                    │
└─────────────────────────────┘
```

**Após Confirmação**:
```
┌─────────────────────────────┐
│ ✅ PEDIDO CRIADO!           │
│                             │
│ ID: VD-001234               │
│ Data: 25/05/2026 14:30      │
│ Total: R$ 150,00            │
│                             │
│ Rastrear em:                │
│ /compras → Buscar por ID    │
│           ou CPF + Telefone │
│                             │
│ [Voltar à Loja]             │
└─────────────────────────────┘
```

### 4. 📦 **Rastreamento de Pedidos**

**Duas formas**:

**Forma 1: Por ID**
```
Entrada: VD-001234
↓
GET /api/pedidos/rastrear?id=VD-001234
↓
Retorna: {
  idRastreio, nome, contato, data, etapa, items, total...
}
```

**Forma 2: Por CPF + Telefone**
```
Entrada: CPF + DDD+telefone (validado)
↓
GET /api/pedidos/rastrear?cpf=123.456.789-00&phone=%2811999999999
↓
Retorna: Array de pedidos
```

**Timeline Visual**:
```
RESERVADO    → CONFIRMADO  → EM_PREPARO  → SAIU_PARA_ENTREGA  → ENTREGUE
    ✅          ✅            ⏳              ⏳                  ⏳
  Seu pedido   Confirmado   Preparando   Saindo para            Entregue
 foi recebido  na loja      na cozinha   entrega em breve

(ou CANCELADO em qualquer etapa)
```

### 5. 🎁 **Sistema de Cupons**

**Tipos de Desconto**:
```
1. Percentual: "10" → 10% off
2. Fixo: "5.00" → R$ 5,00 off
3. Frete Grátis: "frete_gratis" → Frete = 0
```

**Fluxo**:
```
1. Usuário digita cupom no checkout (etapa 4)
   ↓
2. Frontend valida: GET /api/cupons/validar?code=PROMO10
   ↓
3. Backend verifica:
   - Existe?
   - Tem uso disponível (quantidadeUsos > 0)?
   - Não expirou?
   ↓
4. Se OK: Exibe desconto e recalcula total
   ↓
5. Ao confirmar pedido: POST /api/cupons/consumir
   ↓
6. Backend: quantidadeUsos -= 1
```

**Exemplo de Cupom**:
```json
{
  "cupom": "PROMO10",
  "desconto": "10",        // 10% ou R$ 10,00
  "quantidadeUsos": 50     // Restam 50 usos
}
```

### 6. 💰 **Múltiplos Métodos de Pagamento**

#### **PIX**
- ID único gerado via Chave PIX (configurável)
- QR Code dinâmico (frontend renderiza)
- Webhook para confirmar pagamento (futuro)

#### **Dinheiro**
- Cálculo automático de troco
- Campo "troco para" opcional

#### **Cartão de Crédito**
- Parcelamento 1-12 meses
- Cálculo de juros progressivo
- Nota: Integração com gateway real (ex: Stripe) necessária

### 7. 📊 **Gestão de Estoque**

**Fluxo**:
```
Admin cria produto
    ↓
POST /api/estoque
    ├─ nome: "Potinho Tupperware"
    ├─ qtd: 50
    ├─ cores: "Vermelho, Azul, Verde"
    ├─ litros: "0.5, 1.0, 2.0"
    ├─ linha: "FREEZER"
    ├─ valor: 49.90
    └─ imagem: "URL Cloudinary"
    ↓
Usuário compra
    ├─ Quantidade decrementada
    └─ Se qtd = 0 → "Fora de estoque"
    ↓
Admin visualiza
    ├─ GET /api/estoque
    └─ Vê quantidade em tempo real
```

**Validação**:
- Não permite criar pedido se qtd insuficiente
- Transação atômica (tudo ou nada)

### 8. 🔐 **Autenticação Admin**

**Login**:
```
POST /api/auth/login
{
  "email": "admin@sublime.com",
  "senha": "senha123"
}
↓
Backend:
- Busca usuário por email (case-insensitive)
- Valida senha com bcrypt.compare()
- Gera JWT com payload:
  {
    id, nome, apelido,
    isAdmin: true,
    permissoes: { estoque, pedidos, cupons, config, usuarios }
  }
↓
Retorna:
{
  "token": "eyJhbGc...",
  "usuario": { id, nome, apelido }
}
↓
Frontend armazena token em cookie httpOnly (automático)
```

**Proteção de Rotas**:
```typescript
// Em qualquer endpoint admin
const auth = await autenticar(req)
if (auth instanceof NextResponse) return auth  // 401 se inválido

const { usuario } = auth
if (!usuario.isAdmin) return 403 // Acesso negado

// Usar usuario.permissoes para granular
if (!usuario.permissoes?.estoque?.editar) return 403
```

---

## 📊 Modelos de Banco de Dados

### **Model: Estoque**

```prisma
model Estoque {
  id      Int     @id @default(autoincrement())
  qtd     Int                           // Quantidade disponível
  produto String                        // "Potinho", "Tupperware Fruta"
  cores   String                        // JSON: ["Vermelho", "Azul"]
  litros  String                        // JSON: ["0.5", "1.0", "2.0"]
  valor   Decimal @db.Decimal(10, 2)   // R$ 49,90
  linha   Linha                         // FREEZER | AQUECER | ...
  imagem  String                        // URL Cloudinary
  filtros String  @default("")          // Tags para busca
  
  @@index([linha])                      // Performance em filtros
}
```

**Enum: Linha**
```prisma
enum Linha {
  FREEZER     // Produtos para congelador
  AQUECER     // Produtos para aquecimento
  CONSERVAR   // Produtos para conservação
  PREPARAR    // Produtos para preparo
  SERVIR      // Produtos para servir
  ARMAZENAR   // Produtos para armazenamento
}
```

### **Model: Pedido**

```prisma
model Pedido {
  id              Int             @id @default(autoincrement())
  
  // Identificação
  idRastreio      String          @unique          // VD-001, VD-002...
  
  // Dados do Cliente
  nome            String                           // "João Silva"
  contato         String                           // "(11) 99999-9999"
  cpf             String?         @unique          // "123.456.789-00"
  
  // Itens do Pedido
  pedido          Json                             // Array de itens
  // {
  //   "items": [
  //     { "id": 1, "qtd": 2, "valor": 49.90, "cores": "Vermelho" },
  //     { "id": 2, "qtd": 1, "valor": 79.90, "cores": "Azul" }
  //   ]
  // }
  
  // Localização
  endereco        String                           // Rua ou ponto de retirada
  
  // Valores
  totalVenda      Decimal         @db.Decimal(10,2) // Total final
  subtotal        Decimal         @db.Decimal(10,2) // Sem frete
  frete           Decimal         @db.Decimal(10,2) @default(0)
  
  // Pagamento
  metodoPagamento MetodoPagamento                  // PIX | DINHEIRO | CREDITO
  pagamento       StatusPagamento @default(PENDENTE)
  parcelas        Int             @default(1)      // Se parcelado
  trocoPara       Decimal?        @db.Decimal(10,2) // Se dinheiro
  valorALevar     Decimal?        @db.Decimal(10,2) // Troco calculado
  
  // Status
  etapa           EtapaPedido     @default(RESERVADO)
  
  // Desconto
  cupom           String?                          // "PROMO10"
  
  // Auditoria
  dataCompra      DateTime        @default(now())
  
  @@index([cpf])                   // Performance em rastreamento
  @@index([idRastreio])
  @@index([dataCompra])
}
```

**Enums: Pedido**
```prisma
enum MetodoPagamento {
  DINHEIRO
  PIX
  CREDITO
}

enum StatusPagamento {
  PENDENTE
  REALIZADO
}

enum EtapaPedido {
  RESERVADO           // Pedido recebido
  CONFIRMADO          // Confirmado na loja
  EM_PREPARO          // Preparando na cozinha
  SAIU_PARA_ENTREGA   // A caminho
  ENTREGUE            // Entregue
  CANCELADO           // Cancelado
}
```

### **Model: Cliente**

```prisma
model Cliente {
  id      Int      @id @default(autoincrement())
  nome    String                         // "João Silva"
  cpf     String   @unique               // "123.456.789-00"
  compras String[]                       // ["VD-001", "VD-002", "VD-003"]
  contato String                         // "(11) 99999-9999"
  
  @@index([cpf])
}
```

**Relacionamento**: Cliente ↔ Pedido é via array `compras[]` (desnormalizado para performance).

### **Model: Cupom**

```prisma
model Cupom {
  id             Int     @id @default(autoincrement())
  cupom          String  @unique         // "PROMO10"
  desconto       String                  // "10" (%) ou "5.00" (R$)
  quantidadeUsos Int     @default(0)     // 0 = ilimitado, N = limite de N usos
  
  @@index([cupom])
}
```

### **Model: Usuario**

```prisma
model Usuario {
  id        Int      @id @default(autoincrement())
  
  // Identificação
  nome      String
  apelido   String
  email     String   @unique
  
  // Segurança
  senha     String                  // Hash bcrypt
  ativo     Boolean  @default(true)
  
  // Permissões
  isAdmin   Boolean  @default(false)
  permissoes Json?                  // Granular permissions
  // {
  //   "estoque": { "ver": true, "editar": true },
  //   "pedidos": { "ver": true, "editar": true },
  //   "cupons": { "ver": true, "editar": true },
  //   "config": { "ver": true, "editar": true },
  //   "usuarios": { "ver": true, "editar": true }
  // }
  
  // Auditoria
  foto      String?                 // URL Cloudinary
  criadoEm  DateTime @default(now())
  
  @@index([email])
}
```

### **Model: Config**

```prisma
model Config {
  chave String @id                  // "PIX_KEY", "WHATSAPP_NUMBER", "DISCOUNT_PERCENT"
  valor String                      // "chave-pix-123", "+5511999999999", "15"
}
```

**Chaves Comuns**:
- `PIX_KEY` → Chave PIX do vendedor
- `WHATSAPP_NUMBER` → Número para link WhatsApp
- `DISCOUNT_PERCENT` → Desconto global (0-100)
- `FRETE_TAXA_BASE` → Taxa base de frete
- `JUROS_PARCELAMENTO` → % de juros por mês

---

## 🔌 API Endpoints

### 📋 Convenções

```
✅ = Público (sem autenticação)
🔒 = Protegido (requer JWT)
⭐ = Admin only (requer isAdmin: true)

Status HTTP:
- 200 OK
- 201 Created
- 400 Bad Request (validação)
- 401 Unauthorized (JWT inválido)
- 403 Forbidden (sem permissão)
- 404 Not Found
- 500 Internal Server Error
```

### 🔐 **Autenticação**

```http
POST /api/auth/login
✅ Público

Corpo:
{
  "email": "admin@sublime.com",
  "senha": "senha123"
}

Resposta (200):
{
  "token": "eyJhbGc...",
  "usuario": {
    "id": 1,
    "nome": "Admin",
    "apelido": "adm",
    "isAdmin": true,
    "permissoes": {...}
  }
}

Erros:
- 400: Dados inválidos
- 401: Usuário não encontrado
- 401: Senha incorreta
```

```http
GET /api/auth/me
🔒 Autenticado

Resposta (200):
{
  "usuario": {
    "id": 1,
    "nome": "Admin",
    "email": "admin@sublime.com"
  }
}
```

```http
POST /api/auth/logout
✅ Público (apenas limpa cookie)

Resposta (200):
{ "ok": true }
```

### 📦 **Estoque (Produtos)**

```http
GET /api/estoque
✅ Público

Query params:
?linha=FREEZER
?cor=Vermelho
?litros=0.5
?preco_min=0&preco_max=100
?busca=potinho

Resposta (200):
[
  {
    "id": 1,
    "qtd": 50,
    "produto": "Potinho Tupperware",
    "cores": ["Vermelho", "Azul"],
    "litros": ["0.5", "1.0"],
    "valor": "49.90",
    "linha": "FREEZER",
    "imagem": "https://cloudinary.com/...",
    "filtros": "pequeno congelador"
  },
  ...
]
```

```http
POST /api/estoque
⭐ Admin only

Corpo:
{
  "qtd": 50,
  "produto": "Potinho 0.5L",
  "cores": "Vermelho, Azul, Verde",
  "litros": "0.5, 1.0",
  "valor": "49.90",
  "linha": "FREEZER",
  "imagem": "https://cloudinary.com/v1.../...",
  "filtros": "pequeno congelador"
}

Resposta (201):
{ "id": 1, ...produto }

Erros:
- 400: Validação falhou
```

```http
GET /api/estoque/[id]
✅ Público

Resposta (200):
{ "id": 1, ...produto }
```

```http
PATCH /api/estoque/[id]
⭐ Admin only

Corpo (parcial):
{
  "qtd": 45,
  "valor": "49.90"
}

Resposta (200):
{ "id": 1, ...produto_atualizado }
```

```http
DELETE /api/estoque/[id]
⭐ Admin only

Resposta (200):
{ "ok": true }
```

### 🛒 **Pedidos**

```http
GET /api/pedidos
🔒 Autenticado (admin vê todos)

Query:
?etapa=CONFIRMADO
?dataInicio=2026-05-01&dataFim=2026-05-31

Resposta (200):
[
  {
    "id": 1,
    "idRastreio": "VD-001234",
    "nome": "João Silva",
    "contato": "(11) 99999-9999",
    "cpf": "123.456.789-00",
    "pedido": { "items": [...] },
    "endereco": "Rua X, 123",
    "totalVenda": "150.00",
    "subtotal": "120.00",
    "frete": "15.00",
    "metodoPagamento": "PIX",
    "pagamento": "PENDENTE",
    "etapa": "CONFIRMADO",
    "cupom": "PROMO10",
    "dataCompra": "2026-05-25T14:30:00Z"
  },
  ...
]
```

```http
POST /api/pedidos
✅ Público

Corpo:
{
  "nome": "João Silva",
  "contato": "(11) 99999-9999",
  "cpf": "123.456.789-00",
  "items": [
    { "id": 1, "qtd": 2, "valor": 49.90 },
    { "id": 2, "qtd": 1, "valor": 79.90 }
  ],
  "tipo_entrega": "entrega",  // ou "retirada"
  "endereco": "Rua X, 123 - São Paulo, SP",
  "frete": 15.00,
  "metodoPagamento": "PIX",
  "cupom": "PROMO10"
}

Resposta (201):
{
  "idRastreio": "VD-001234",
  "totalVenda": "150.00",
  "message": "Pedido criado com sucesso"
}

Erros:
- 400: Validação falhou
- 400: Produto fora de estoque
- 400: Cupom inválido
```

```http
GET /api/pedidos/rastrear
✅ Público

Query (uma das):
?id=VD-001234
?cpf=123.456.789-00&phone=%2B5511999999999

Resposta (200):
{
  // Single pedido se por ID
  // Array de pedidos se por CPF
}

Erros:
- 404: Pedido não encontrado
```

```http
GET /api/pedidos/[id]
🔒 Autenticado (admin)

Resposta (200):
{ ...pedido_completo }
```

```http
PATCH /api/pedidos/[id]
⭐ Admin only

Corpo:
{
  "etapa": "EM_PREPARO",
  "pagamento": "REALIZADO"
}

Resposta (200):
{ ...pedido_atualizado }
```

### 🎁 **Cupons**

```http
GET /api/cupons
🔒 Autenticado (admin)

Resposta (200):
[
  {
    "id": 1,
    "cupom": "PROMO10",
    "desconto": "10",
    "quantidadeUsos": 50
  },
  ...
]
```

```http
POST /api/cupons
⭐ Admin only

Corpo:
{
  "cupom": "PROMO10",
  "desconto": "10",          // % ou R$ ou "frete_gratis"
  "quantidadeUsos": 100      // 0 = ilimitado
}

Resposta (201):
{ "id": 1, ...cupom }
```

```http
GET /api/cupons/validar
✅ Público

Query:
?code=PROMO10

Resposta (200):
{
  "valido": true,
  "desconto": "10",
  "usos_restantes": 50
}

ou (400):
{
  "valido": false,
  "motivo": "Cupom expirado ou limite atingido"
}
```

```http
POST /api/cupons/consumir
✅ Público

Corpo:
{
  "cupom": "PROMO10"
}

Resposta (200):
{ "ok": true, "usos_restantes": 49 }
```

### 👥 **Usuários (Admin)**

```http
GET /api/usuarios
⭐ Admin only

Resposta (200):
[
  {
    "id": 1,
    "nome": "Admin",
    "email": "admin@sublime.com",
    "isAdmin": true,
    "ativo": true,
    "permissoes": {...}
  },
  ...
]
```

```http
POST /api/usuarios
⭐ Admin only

Corpo:
{
  "nome": "Novo User",
  "apelido": "new",
  "email": "new@sublime.com",
  "senha": "senha123",
  "isAdmin": false,
  "permissoes": {
    "estoque": { "ver": true, "editar": false },
    "pedidos": { "ver": true, "editar": false }
  }
}

Resposta (201):
{ "id": 2, ...usuario }
```

```http
GET /api/usuarios/[id]
⭐ Admin only

Resposta (200):
{ ...usuario }
```

```http
PATCH /api/usuarios/[id]
⭐ Admin only

Corpo (parcial):
{
  "nome": "Novo Nome",
  "ativo": false
}

Resposta (200):
{ ...usuario_atualizado }
```

```http
DELETE /api/usuarios/[id]
⭐ Admin only

Resposta (200):
{ "ok": true }
```

### ⚙️ **Configurações**

```http
GET /api/config/pix
🔒 Autenticado (admin)

Resposta (200):
{
  "chave": "123e4567-e89b-12d3-a456-426614174000"
}
```

```http
PATCH /api/config/pix
⭐ Admin only

Corpo:
{
  "chave": "nova-chave-pix"
}

Resposta (200):
{ "ok": true, "chave": "..." }
```

### 📤 **Upload**

```http
POST /api/upload
✅ Público

Corpo (FormData):
file: <binary>

Resposta (201):
{
  "url": "https://res.cloudinary.com/.../.../...",
  "publicId": "sublime/produtos/...",
  "format": "jpg"
}

Erros:
- 400: Arquivo obrigatório
- 413: Arquivo muito grande
```

---

## 🎨 Componentes de UI

### Estrutura de Componentes

```
App
├── RootLayout
│   ├── CartProvider
│   ├── ToastProvider
│   │
│   ├── Header
│   │   ├── Logo
│   │   ├── Search
│   │   └── CartIcon (badge)
│   │
│   ├── SideMenu (mobile)
│   │
│   ├── Main Content
│   │   ├── StorePage
│   │   │   ├── Carousel
│   │   │   ├── FilterSidebar
│   │   │   └── ProductGrid
│   │   │       └── ProductCard
│   │   │           └── VariationsModal
│   │   │
│   │   ├── CheckoutPage
│   │   │   ├── StepIndicator
│   │   │   ├── FormStep
│   │   │   │   ├── DadosStep
│   │   │   │   ├── EntregaStep
│   │   │   │   ├── PagamentoStep
│   │   │   │   └── ResumoStep
│   │   │   └── OrderSummary
│   │   │       └── SuccessModal
│   │   │
│   │   └── ComprasPage
│   │       └── RastreamentoForm
│   │           └── Timeline
│   │
│   ├── CartSidebar
│   │
│   ├── ToastContainer
│   │
│   └── Footer
```

### Componentes Principais

#### **Header.jsx**
- Logo da loja
- Campo de busca
- Badge com quantidade de itens no carrinho
- Ícone para abrir/fechar carrinho
- Links de navegação (Home, Rastreamento, Admin)

#### **Carousel.jsx**
- 3 slides automáticos com transição suave
- Gradient overlay com CTA
- Indicadores de slide (dots)
- Auto-play com pause on hover

#### **FilterSidebar.jsx**
- Filtro por linha (checkboxes)
- Filtro por cor (checkboxes)
- Filtro por capacidade (litros)
- Filtro por faixa de preço (range slider)
- Busca textual
- Botão "Limpar filtros"

#### **ProductCard.jsx**
```jsx
<ProductCard>
  <Image />
  <Name>Potinho Tupperware</Name>
  <Colors>[Vermelho] [Azul] [Verde]</Colors>
  <Sizes>[0.5L] [1.0L] [2.0L]</Sizes>
  <Price>R$ 49,90</Price>
  <DiscountPrice>R$ 42,41 (-15%)</DiscountPrice>
  <Button onClick={() => openVariationsModal()}>
    Adicionar ao Carrinho
  </Button>
</ProductCard>
```

#### **VariationsModal.jsx**
- Seleção de cor
- Seleção de capacidade (litros)
- Input de quantidade
- Botão "Adicionar ao Carrinho"
- Cálculo de preço total

#### **CartSidebar.jsx**
```jsx
<CartSidebar isOpen={sidebarOpen}>
  <Header>
    <Title>Seu Carrinho ({itemCount})</Title>
    <CloseButton />
  </Header>
  
  <Items>
    {items.map(item => (
      <CartItem>
        <Image />
        <Info>
          <Name>{item.descricao}</Name>
          <Color>{item.cores}</Color>
          <Size>{item.capacidade}L</Size>
        </Info>
        <Qty>
          <Button>-</Button>
          <Input value={item.quantity} />
          <Button>+</Button>
        </Qty>
        <Price>R$ {item.valor * item.quantity}</Price>
        <DeleteButton />
      </CartItem>
    ))}
  </Items>
  
  <Totals>
    <Row>Subtotal: R$ {subtotal}</Row>
    <Row>Frete: R$ {frete}</Row>
    <Row>Desconto: -R$ {desconto}</Row>
    <Row highlight>Total: R$ {total}</Row>
  </Totals>
  
  <Buttons>
    <Button primary>Ir para Checkout</Button>
    <Button>Continuar Comprando</Button>
  </Buttons>
</CartSidebar>
```

#### **StepIndicator.jsx**
```
Step 1: Dados       ✅ Completed
Step 2: Entrega     → Current
Step 3: Pagamento   ⏳ Pending
Step 4: Confirmação ⏳ Pending
```

#### **OrderSummary.jsx**
- Lista de itens do pedido
- Subtotal
- Frete (calculado)
- Campo de cupom com validação
- Desconto aplicado
- Total final
- Resumo formatado

#### **SuccessModal.jsx**
```
┌─────────────────────────┐
│ ✅ PEDIDO CRIADO!       │
├─────────────────────────┤
│ ID: VD-001234           │
│ Data: 25/05/2026 14:30  │
│ Total: R$ 150,00        │
├─────────────────────────┤
│ Próximos passos:        │
│ • Acompanhe seu pedido  │
│   em /compras           │
│ • Receba atualizações   │
│   por telefone          │
└─────────────────────────┘
```

#### **ToastContainer.jsx**
- Renderiza toasts (notificações)
- Posição: top-right
- Auto-dismiss em 5 segundos
- Tipos: info, success, error
- Ícones customizados

---

## 🧠 Gerenciamento de Estado

### CartContext.jsx

**Estado (Reducer)**:
```javascript
{
  items: [
    {
      id: number,
      descricao: string,
      cores: string,
      imagem: string,
      capacidade: string,  // litros
      quantidade: number,
      valor: number,       // preço unitário
      valorOriginal: number
    }
  ],
  sidebarOpen: boolean,
  error: string | null
}
```

**Ações (Actions)**:
```javascript
{
  type: 'LOAD',
  payload: items  // Carrega do localStorage
}

{
  type: 'ADD',
  payload: {
    id, descricao, cores, imagem, capacidade,
    quantidade, valor, valorOriginal
  }
}

{
  type: 'REMOVE',
  payload: itemId
}

{
  type: 'UPDATE_QTY',
  payload: { itemId, quantity }
}

{
  type: 'CLEAR'
}

{
  type: 'TOGGLE_SIDEBAR'
}

{
  type: 'CLOSE_SIDEBAR'
}
```

**Hook Público**:
```javascript
export const useCart = () => {
  const { state, dispatch } = useContext(CartContext)
  
  return {
    items: state.items,
    isEmpty: state.items.length === 0,
    totalItems: state.items.reduce((sum, item) => sum + item.quantidade, 0),
    totalPrice: state.items.reduce((sum, item) => sum + (item.valor * item.quantidade), 0),
    error: state.error,
    
    add: (item) => dispatch({ type: 'ADD', payload: item }),
    remove: (itemId) => dispatch({ type: 'REMOVE', payload: itemId }),
    updateQty: (itemId, qty) => dispatch({ type: 'UPDATE_QTY', payload: { itemId, qty } }),
    clear: () => dispatch({ type: 'CLEAR' }),
    
    toggleSidebar: () => dispatch({ type: 'TOGGLE_SIDEBAR' }),
    closeSidebar: () => dispatch({ type: 'CLOSE_SIDEBAR' }),
    sidebarOpen: state.sidebarOpen
  }
}
```

**Persistência**:
```javascript
useEffect(() => {
  // Salva no localStorage quando items mudam
  localStorage.setItem('sublime_cart', JSON.stringify(state.items))
}, [state.items])

useEffect(() => {
  // Carrega do localStorage na inicialização
  const saved = localStorage.getItem('sublime_cart')
  if (saved) {
    dispatch({ type: 'LOAD', payload: JSON.parse(saved) })
  }
}, [])
```

### ToastContext.jsx

**Estado**:
```javascript
{
  toasts: [
    {
      id: string (uuid),
      message: string,
      type: 'info' | 'success' | 'error',
      title?: string,
      duration: number,  // ms (default: 5000)
      exiting?: boolean
    }
  ]
}
```

**Funções Públicas**:
```javascript
export const useToast = () => {
  return {
    showToast: (message, type = 'info', options = {}) => {
      // Cria novo toast com auto-dismiss
    },
    removeToast: (toastId) => {
      // Remove manualmente
    },
    toasts: state.toasts
  }
}
```

**Exemplo de Uso**:
```javascript
const { showToast } = useToast()

showToast('Produto adicionado ao carrinho!', 'success')
showToast('Erro ao validar cupom', 'error', { duration: 7000 })
```

---

## 🔐 Autenticação & Autorização

### Fluxo de Login

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ POST /api/auth/login
       │ { email, senha }
       ↓
┌─────────────────────┐
│  API Route Handler  │
├─────────────────────┤
│ 1. Parse JSON       │
│ 2. Validar Zod      │
│ 3. Buscar Usuario   │
│ 4. Validar Senha    │
│ 5. Gerar JWT        │
│ 6. Retornar token   │
└──────┬──────────────┘
       │ { token, usuario }
       ↓
┌─────────────┐
│   Browser   │
│ localStorage│ ← Token armazenado
└─────────────┘
```

### Middleware de Autenticação

```typescript
// lib/middleware.ts
export async function autenticar(req: NextRequest) {
  try {
    // Extrai token do header Authorization
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { erro: 'Token não fornecido' },
        { status: 401 }
      )
    }
    
    // Verifica JWT
    const payload = await verifyJwt(token)
    if (!payload) {
      return NextResponse.json(
        { erro: 'Token inválido' },
        { status: 401 }
      )
    }
    
    // Retorna payload com dados do usuário
    return { usuario: payload }
  } catch (err) {
    return NextResponse.json(
      { erro: 'Erro ao validar token' },
      { status: 401 }
    )
  }
}
```

**Uso em Endpoints**:
```typescript
export async function GET(req: NextRequest) {
  // Proteger rota admin
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth
  
  // Verificar isAdmin
  if (!auth.usuario.isAdmin) {
    return NextResponse.json(
      { erro: 'Acesso restrito' },
      { status: 403 }
    )
  }
  
  // Lógica da rota...
  const data = await prisma.estoque.findMany()
  return NextResponse.json(data)
}
```

### Permissões Granulares

**Estrutura de Permissões**:
```json
{
  "estoque": {
    "ver": true,     // GET
    "editar": true   // POST/PATCH/DELETE
  },
  "pedidos": {
    "ver": true,
    "editar": true
  },
  "cupons": {
    "ver": true,
    "editar": true
  },
  "config": {
    "ver": true,
    "editar": true
  },
  "usuarios": {
    "ver": true,
    "editar": true
  }
}
```

**Verificação de Permissão**:
```typescript
function temPermissao(usuario, recurso, acao) {
  if (!usuario.isAdmin) return false
  
  const perms = usuario.permissoes?.[recurso]
  return perms?.[acao] === true
}

// Uso
if (!temPermissao(auth.usuario, 'estoque', 'editar')) {
  return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
}
```

---

## 🔗 Integrações com Terceiros

### 🖼️ Cloudinary

**Configuração**:
```javascript
// .env.local
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
```

**Upload de Imagem**:
```typescript
// lib/cloudinary.ts
import cloudinary from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function uploadImage(file: Buffer) {
  return new Promise((resolve, reject) => {
    cloudinary.v2.uploader
      .upload_stream(
        {
          folder: 'sublime/produtos',
          resource_type: 'auto'
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )
      .end(file)
  })
}
```

**Endpoint de Upload**:
```typescript
// app/api/upload/route.ts
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file')
  
  if (!file) {
    return NextResponse.json(
      { erro: 'Arquivo obrigatório' },
      { status: 400 }
    )
  }
  
  const buffer = await file.arrayBuffer()
  const result = await uploadImage(Buffer.from(buffer))
  
  return NextResponse.json({
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format
  })
}
```

### 📮 ViaCEP

**Consulta de Endereço**:
```javascript
// lib/viacep.ts
export async function buscarCEP(cep) {
  const response = await fetch(
    `https://viacep.com.br/ws/${cep}/json/`
  )
  
  if (!response.ok) throw new Error('CEP não encontrado')
  
  const data = await response.json()
  
  if (data.erro) throw new Error('CEP inválido')
  
  return {
    cep: data.cep,
    rua: data.logradouro,
    bairro: data.bairro,
    cidade: data.localidade,
    estado: data.uf,
    complemento: data.complemento
  }
}
```

**Uso no Checkout**:
```javascript
const [cep, setCep] = useState('')

const handleBlur = async () => {
  try {
    const endereco = await buscarCEP(cep)
    setEndereco(endereco)
    calcularFrete(endereco.cidade)
  } catch (err) {
    showToast(err.message, 'error')
  }
}
```

### 🗺️ OpenStreetMap Nominatim

**Geocodificação**:
```javascript
// lib/nominatim.ts
export async function geocodificar(endereco) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?` +
    `format=json&q=${encodeURIComponent(endereco)}&limit=1`
  )
  
  const data = await response.json()
  
  if (!data.length) throw new Error('Endereço não encontrado')
  
  return {
    lat: data[0].lat,
    lon: data[0].lon,
    displayName: data[0].display_name
  }
}
```

**Uso em Cálculo de Frete**:
```javascript
const geoOrigem = await geocodificar('Rua X, 123, São Paulo')
const geoDestino = await geocodificar(enderecoCliente)

const distancia = calcularDistancia(
  geoOrigem.lat, geoOrigem.lon,
  geoDestino.lat, geoDestino.lon
)

const frete = calcularFrete(distancia)
```

### 🗄️ Neon Database

**Configuração Prisma**:
```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["neonAdapter"]
}
```

**Conexão Serverless**:
```typescript
// lib/prisma.ts
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'
import { Pool } from '@neondatabase/serverless'

const globalForPrisma = globalThis

function createPrismaClient() {
  const neon = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaNeon(neon)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

**Variáveis de Ambiente**:
```
DATABASE_URL=postgresql://user:password@ep-xxxxx.neon.tech/dbname?sslmode=require
```

---

## 🎬 Fluxos de Negócio

### 1️⃣ Fluxo de Compra Completo

```
┌──────────────────────────────────────────────────────────────┐
│                    JORNADA DO COMPRADOR                       │
└──────────────────────────────────────────────────────────────┘

1. DISCOVER
   └─ Usuário entra em /
   └─ Vê catálogo com Carousel + Filtros
   └─ Busca por linha, cor, preço
   └─ Clica em ProductCard

2. SELECT
   └─ Modal abre com variações
   └─ Escolhe cor e capacidade
   └─ Define quantidade
   └─ Clica "Adicionar ao Carrinho"
   └─ Toast: "Adicionado com sucesso"
   └─ CartContext incrementa count
   └─ localStorage salva carrinho

3. REVIEW
   └─ Clica no ícone carrinho
   └─ CartSidebar abre
   └─ Vê itens, qty, preços
   └─ Pode aumentar/diminuir/remover
   └─ Subtotal recalculado automaticamente
   └─ Clica "Ir para Checkout"

4. CHECKOUT - ETAPA 1: DADOS
   └─ Preenche nome, telefone, CPF (opcional)
   └─ Validação em tempo real
   └─ Clica "Próximo"

5. CHECKOUT - ETAPA 2: ENTREGA
   └─ Escolhe Retirada ou Entrega
   
   Se Retirada:
   └─ Campo com local padrão
   └─ Quem retira, data e hora
   
   Se Entrega:
   └─ Digita CEP
   └─ ViaCEP auto-preenche endereço
   └─ Geocodifica e calcula frete
   └─ Frete exibido com aviso se fora da área
   └─ Clica "Próximo"

6. CHECKOUT - ETAPA 3: PAGAMENTO
   └─ Escolhe método: PIX, Dinheiro ou Cartão
   
   Se PIX:
   └─ Gera chave PIX dinâmica
   
   Se Dinheiro:
   └─ Campo "troco para" opcional
   └─ Sistema calcula troco automaticamente
   
   Se Cartão:
   └─ Seleciona parcelamento (1-12x)
   └─ Sistema mostra juros progressivo
   
   └─ Clica "Próximo"

7. CHECKOUT - ETAPA 4: CONFIRMAÇÃO
   └─ Vê OrderSummary
   └─ Itens, subtotal, frete, desconto, total
   └─ Pode aplicar cupom
   └─ Valida e recalcula total
   └─ Clica "Confirmar Pedido"

8. CREATE ORDER
   └─ POST /api/pedidos
   └─ Backend:
      ├─ Valida estoque (transação)
      ├─ Decrementa estoque (qtd)
      ├─ Gera ID único (VD-XXXXX)
      ├─ Cria registro Pedido
      ├─ Consome cupom (se houver)
      ├─ Atualiza/cria Cliente
      └─ Retorna idRastreio

9. SUCCESS
   └─ SuccessModal exibe:
   ├─ ✅ Pedido criado
   ├─ ID: VD-001234
   ├─ Data: 25/05/2026 14:30
   ├─ Total: R$ 150,00
   └─ CTA: Ir para /compras para rastrear

10. RASTREAMENTO
    └─ Usuário vai para /compras
    └─ Digita ID (VD-001234) ou CPF+Telefone
    └─ GET /api/pedidos/rastrear
    └─ Timeline mostra etapas:
       RESERVADO → CONFIRMADO → EM_PREPARO
       → SAIU_PARA_ENTREGA → ENTREGUE

11. NOTIFICAÇÃO (futuro)
    └─ Webhook de mudança de status
    └─ SMS/WhatsApp para usuário
    └─ Toast in-app quando status muda
```

### 2️⃣ Fluxo de Gestão Admin

```
┌──────────────────────────────────────────────────────────────┐
│                    JORNADA DO ADMIN                           │
└──────────────────────────────────────────────────────────────┘

1. LOGIN
   └─ Admin vai para /admin/login
   └─ Digita email + senha
   └─ POST /api/auth/login
   └─ JWT retornado e salvo em cookie
   └─ Redirecionado para /admin

2. GERENCIAR ESTOQUE
   └─ Vai para /admin/estoque
   
   VISUALIZAR:
   └─ GET /api/estoque
   └─ Grid com todos os produtos
   
   CRIAR:
   └─ Clica "Novo Produto"
   └─ Form: nome, cores, capacidades, preço, linha
   └─ Upload de imagem → Cloudinary
   └─ POST /api/estoque
   
   EDITAR:
   └─ Clica no produto
   └─ Modal de edição
   └─ PATCH /api/estoque/[id]
   
   DELETAR:
   └─ Clica "Deletar"
   └─ Confirmação
   └─ DELETE /api/estoque/[id]

3. GERENCIAR PEDIDOS
   └─ Vai para /admin/pedidos
   └─ GET /api/pedidos
   └─ Lista com filtros (etapa, data)
   
   ATUALIZAR STATUS:
   └─ Clica no pedido
   └─ Dropdown: RESERVADO → CONFIRMADO → ...
   └─ PATCH /api/pedidos/[id]
   └─ Webhook enviado (futuro)

4. GERENCIAR CUPONS
   └─ Vai para /admin/cupons
   └─ GET /api/cupons
   
   CRIAR:
   └─ POST /api/cupons
   └─ Código, tipo desconto, limite de uso
   
   EDITAR/DELETAR:
   └─ PATCH/DELETE /api/cupons/[id]

5. CONFIGURAÇÕES
   └─ Vai para /admin/config
   
   CHAVE PIX:
   └─ GET/PATCH /api/config/pix
   └─ Salva chave para gerar QR Code
   
   CONFIG DE VENDAS:
   └─ GET/PATCH /api/config/vendas
   └─ Desconto global, frete, juros, etc

6. GERENCIAR USUÁRIOS
   └─ Vai para /admin/usuarios
   └─ GET /api/usuarios
   
   CRIAR NOVO ADMIN:
   └─ POST /api/usuarios
   └─ Nome, email, permissões granulares
   
   EDITAR/DELETAR:
   └─ PATCH/DELETE /api/usuarios/[id]
```

### 3️⃣ Fluxo de Processamento de Pedido

```
┌──────────────────────────────────────────────────────────────┐
│              CICLO DE VIDA DE UM PEDIDO                       │
└──────────────────────────────────────────────────────────────┘

[1] RESERVADO (Estado Inicial)
    └─ Pedido criado
    └─ Estoque decrementado
    └─ ID único gerado (VD-XXXXX)
    └─ Aguardando confirmação manual do admin
    └─ Data: 25/05/2026 14:30

[2] CONFIRMADO (Admin confirma)
    └─ Admin vai ao /admin/pedidos
    └─ Verifica dados (cliente, itens, etc)
    └─ Clica "Confirmar"
    └─ PATCH /api/pedidos/[id] { etapa: 'CONFIRMADO' }
    └─ Notificação pode ser enviada (SMS/WhatsApp)

[3] EM_PREPARO (Separando/preparando itens)
    └─ Admin mudar status quando começar a preparar
    └─ Picker pega itens do estoque
    └─ Verifica qtd e qualidade
    └─ Prepara embalagem

[4] SAIU_PARA_ENTREGA (Entregador saiu)
    └─ Admin mudar status quando entregador sair
    └─ Cliente recebe notificação
    └─ Link de rastreamento em tempo real (futuro)

[5] ENTREGUE (Delivery confirmou entrega)
    └─ Admin ou webhook confirma
    └─ PATCH /api/pedidos/[id] { etapa: 'ENTREGUE' }
    └─ Cliente recebe confirmação
    └─ Pedido finalizado

ou

[X] CANCELADO (Se algo der errado)
    └─ Admin clica "Cancelar"
    └─ Estoque é incrementado de volta
    └─ Cliente é notificado
    └─ Reembolso iniciado (se pago)

Timeline Visual no /compras:
┌──────────────────────────────────────────┐
│ RESERVADO    CONFIRMADO    EM_PREPARO   │
│    ✅           ✅            ⏳         │
│ Recebido    Confirmado    Preparando   │
│                                        │
│ SAIU_PARA_ENTREGA    ENTREGUE         │
│       ⏳                ⏳             │
│ A caminho           Entregue          │
└──────────────────────────────────────────┘
```

---

## 🚀 Setup e Deploy

### 📋 Pré-requisitos

```bash
Node.js 18+ (recomendado 20+)
npm ou yarn
PostgreSQL 14+ (ou Neon account)
Conta Cloudinary (free tier ok)
Git
```

### 🔧 Setup Local

```bash
# 1. Clone o repo
git clone <repo>
cd sublime

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env.local

# 4. Preencha .env.local
DATABASE_URL=postgresql://...
JWT_SECRET=sua_chave_secreta_aqui (min 32 chars)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# 5. Execute migrations
npx prisma migrate dev --name init

# 6. Seed inicial (opcional)
npx prisma db seed
# ou
python python/seed_neon.py

# 7. Inicie dev server
npm run dev

# Acesso:
# http://localhost:3000 (Loja)
# http://localhost:3000/admin (Admin, com login)
# http://localhost:3000/compras (Rastreamento público)
```

### 🔑 Variáveis de Ambiente

```bash
# .env.local

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require

# JWT
JWT_SECRET=sua_chave_secreta_de_minimo_32_caracteres_aleatorios

# Cloudinary
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret

# Configurações de Negócio
NEXT_PUBLIC_STORE_NAME=Sublime Tupperware
NEXT_PUBLIC_STORE_EMAIL=contato@sublime.com
NEXT_PUBLIC_WHATSAPP_NUMBER=+5511999999999
NEXT_PUBLIC_DISCOUNT_PERCENT=15

# API
NEXT_PUBLIC_API_URL=http://localhost:3000 (dev)
# https://sublime.com.br (prod)
```

### 📦 Scripts Disponíveis

```bash
# Development
npm run dev
# Starts Next.js dev server on :3000

# Build
npm run build
# Production build

# Production
npm run start
# Runs production server

# Database
npx prisma studio
# GUI para visualizar/editar banco

npx prisma migrate dev
# Cria nova migration

npx prisma db seed
# Executa seed.ts

npx prisma db push
# Synca schema com banco (sem migrations)
```

### 🌐 Deploy no Vercel

```bash
# 1. Push para GitHub
git push origin main

# 2. Connect no Vercel
vercel

# 3. Configure variáveis no Vercel Dashboard
DATABASE_URL=...
JWT_SECRET=...
CLOUDINARY_*=...

# 4. Deploy automático (main branch)
# Vercel auto-deploy em cada push

# 5. Acesse
https://seu-projeto.vercel.app
```

### 🗄️ Deploy do Banco (Neon)

```bash
# 1. Crie account em neon.tech

# 2. Crie novo projeto PostgreSQL

# 3. Copie connection string
postgresql://user:pass@ep-xxxxx.neon.tech/dbname?sslmode=require

# 4. Configure em .env.local (local)
DATABASE_URL=postgresql://...

# 5. Execute migrations
npx prisma migrate deploy

# 6. Configure em Vercel
VERCEL_DASHBOARD → Environment Variables
DATABASE_URL=postgresql://...

# Pronto! Vercel + Neon = Serverless Full-Stack
```

### 🔍 Troubleshooting

**Erro: "PRISMA_SCHEMA_ERROR"**
```bash
# Recrie o Prisma client
npx prisma generate
npx prisma db push --skip-generate
```

**Erro: "Unable to require database"**
```bash
# Verifique DATABASE_URL em .env.local
# Certifique-se que PostgreSQL está rodando
# Teste conexão: psql $DATABASE_URL
```

**Erro: "JWT_SECRET not defined"**
```bash
# Gere uma chave aleatória
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Coloque em JWT_SECRET no .env.local
```

---

## 📝 Changelog

### v1.0.0 (25 maio 2026)
- ✅ Catálogo com filtros
- ✅ Carrinho com persistência
- ✅ Checkout em 4 etapas
- ✅ Rastreamento de pedidos
- ✅ Sistema de cupons
- ✅ Múltiplos métodos de pagamento
- ✅ Painel administrativo
- ✅ Upload de imagens (Cloudinary)
- ✅ Autenticação JWT

### Roadmap

- 🚀 Webhooks para notificações (SMS, WhatsApp)
- 🚀 Integração com Gateway de Pagamento (Stripe)
- 🚀 Relatórios e Analytics
- 🚀 Programa de Fidelidade
- 🚀 Wishlist/Favoritos
- 🚀 Reviews de Produtos
- 🚀 Recomendações IA
- 🚀 App Mobile (React Native)

---

## 📞 Suporte

- **Email**: dev@sublime.com
- **GitHub Issues**: [repo]/issues
- **Documentation**: ./historia (este arquivo)

---

## 📄 License

MIT © 2026 Sublime Tupperware

---

**Gerado automaticamente em**: 25 de maio de 2026  
**Versão da Documentação**: 1.0.0  
**Status**: Produção  
