# 🔌 REFERÊNCIA RÁPIDA DE ENDPOINTS

**Versão**: 1.0.0 | **Atualizado**: 25 maio 2026

---

## ⚡ Cheat Sheet

```
✅ Público (sem autenticação)
🔒 Autenticado (requer JWT)
⭐ Admin only (requer isAdmin=true)
```

---

## 🔐 Autenticação

```http
POST /api/auth/login
✅ Público
Body: { email, senha }
Response: { token, usuario }

GET /api/auth/me
🔒 Requer JWT
Response: { usuario }

POST /api/auth/logout
✅ Sem autenticação
Response: { ok: true }
```

---

## 📦 Estoque (Produtos)

### Listar
```http
GET /api/estoque
✅ Público

Filtros (query params):
?linha=FREEZER
?cor=Vermelho
?litros=0.5
?preco_min=0&preco_max=100
?busca=potinho

Exemplo:
GET /api/estoque?linha=FREEZER&busca=tupperware
```

### Detalhes
```http
GET /api/estoque/[id]
✅ Público
Response: { id, qtd, produto, cores, litros, valor, linha, imagem }
```

### Criar
```http
POST /api/estoque
⭐ Admin only
Body: {
  qtd: number,
  produto: string,
  cores: string,
  litros: string,
  valor: decimal,
  linha: "FREEZER" | "AQUECER" | "CONSERVAR" | "PREPARAR" | "SERVIR" | "ARMAZENAR",
  imagem: string (URL),
  filtros?: string
}
Response: { id, ...produto }
```

### Atualizar
```http
PATCH /api/estoque/[id]
⭐ Admin only
Body: { qtd?, produto?, valor?, ... } (parcial)
Response: { id, ...produto_atualizado }
```

### Deletar
```http
DELETE /api/estoque/[id]
⭐ Admin only
Response: { ok: true }
```

---

## 🛒 Pedidos

### Listar (Admin)
```http
GET /api/pedidos
🔒 Autenticado (admin)
Query: ?etapa=CONFIRMADO&dataInicio=2026-05-01&dataFim=2026-05-31
Response: [ { id, idRastreio, nome, contato, ... }, ... ]
```

### Criar
```http
POST /api/pedidos
✅ Público
Body: {
  nome: string,
  contato: string,
  cpf?: string,
  items: [{ id, qtd, valor }, ...],
  tipo_entrega: "entrega" | "retirada",
  endereco: string,
  frete: number,
  metodoPagamento: "PIX" | "DINHEIRO" | "CREDITO",
  cupom?: string,
  parcelas?: number,
  trocoPara?: number
}
Response: { idRastreio, totalVenda, message }
Status: 201 Created
```

### Rastrear
```http
GET /api/pedidos/rastrear
✅ Público

Forma 1: Por ID
?id=VD-001234

Forma 2: Por CPF + Telefone
?cpf=123.456.789-00&phone=%2B5511999999999

Response (1 pedido):
{
  idRastreio, nome, contato, etapa, dataCompra, items, total, ...
}

Response (múltiplos por CPF):
[ { idRastreio, ... }, { idRastreio, ... }, ... ]
```

### Detalhes (Admin)
```http
GET /api/pedidos/[id]
🔒 Autenticado (admin)
Response: { id, idRastreio, nome, contato, cpf, pedido, endereco, 
           totalVenda, subtotal, frete, metodoPagamento, pagamento, 
           etapa, cupom, dataCompra, parcelas, trocoPara, valorALevar }
```

### Atualizar Status (Admin)
```http
PATCH /api/pedidos/[id]
⭐ Admin only
Body: {
  etapa?: "RESERVADO" | "CONFIRMADO" | "EM_PREPARO" | "SAIU_PARA_ENTREGA" | "ENTREGUE" | "CANCELADO",
  pagamento?: "PENDENTE" | "REALIZADO"
}
Response: { id, ...pedido_atualizado }
```

---

## 🎁 Cupons

### Listar (Admin)
```http
GET /api/cupons
⭐ Admin only
Response: [ { id, cupom, desconto, quantidadeUsos }, ... ]
```

### Criar
```http
POST /api/cupons
⭐ Admin only
Body: {
  cupom: string (ex: "PROMO10"),
  desconto: string (ex: "10" para %, "5.00" para R$),
  quantidadeUsos: number (0 = ilimitado)
}
Response: { id, cupom, desconto, quantidadeUsos }
Status: 201 Created
```

### Validar
```http
GET /api/cupons/validar
✅ Público
Query: ?code=PROMO10
Response: { valido: true, desconto, usos_restantes }
Status: 200 OK
ou
Response: { valido: false, motivo: "..." }
Status: 400 Bad Request
```

### Consumir (Decrementar uso)
```http
POST /api/cupons/consumir
✅ Público
Body: { cupom: "PROMO10" }
Response: { ok: true, usos_restantes: 49 }
```

---

## 👥 Usuários (Admin)

### Listar
```http
GET /api/usuarios
⭐ Admin only
Response: [ { id, nome, email, isAdmin, ativo, permissoes }, ... ]
```

### Criar
```http
POST /api/usuarios
⭐ Admin only
Body: {
  nome: string,
  apelido: string,
  email: string,
  senha: string (min 8 chars),
  isAdmin: boolean,
  permissoes?: {
    estoque: { ver: boolean, editar: boolean },
    pedidos: { ver: boolean, editar: boolean },
    cupons: { ver: boolean, editar: boolean },
    config: { ver: boolean, editar: boolean },
    usuarios: { ver: boolean, editar: boolean }
  }
}
Response: { id, nome, email, ... }
Status: 201 Created
```

### Detalhes
```http
GET /api/usuarios/[id]
⭐ Admin only
Response: { id, nome, email, isAdmin, ativo, permissoes }
```

### Atualizar
```http
PATCH /api/usuarios/[id]
⭐ Admin only
Body: { nome?, email?, senha?, ativo?, permissoes? }
Response: { id, ...usuario_atualizado }
```

### Deletar
```http
DELETE /api/usuarios/[id]
⭐ Admin only
Response: { ok: true }
```

---

## ⚙️ Configurações

### Chave PIX
```http
GET /api/config/pix
🔒 Autenticado (admin)
Response: { chave: "123e4567-e89b-12d3-a456-426614174000" }

PATCH /api/config/pix
⭐ Admin only
Body: { chave: "nova-chave-pix" }
Response: { ok: true, chave: "..." }
```

### Config de Vendas
```http
GET /api/config/vendas
🔒 Autenticado (admin)
Response: { 
  discount_percent: number,
  whatsapp_number: string,
  frete_base: number,
  juros_parcelamento: number,
  ...
}

PATCH /api/config/vendas
⭐ Admin only
Body: { discount_percent?, whatsapp_number?, frete_base?, ... }
Response: { ok: true, config }
```

---

## 📤 Upload

```http
POST /api/upload
✅ Público
Content-Type: multipart/form-data
Body: FormData { file: <binary> }

Response (201):
{
  url: "https://res.cloudinary.com/...",
  publicId: "sublime/produtos/...",
  format: "jpg"
}
```

---

## 🆘 Debug

```http
GET /api/debug
✅ Público (apenas dev)
Response: {
  timestamp: ISO8601,
  node_env: "development" | "production",
  database_status: "connected" | "error",
  uptime_seconds: number
}
```

---

## 📊 Exemplos de Uso

### JavaScript/Fetch

```javascript
// Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    email: 'admin@sublime.com', 
    senha: 'senha123' 
  })
})
const { token, usuario } = await loginResponse.json()

// Buscar produtos
const productsResponse = await fetch('/api/estoque?linha=FREEZER')
const products = await productsResponse.json()

// Criar pedido
const orderResponse = await fetch('/api/pedidos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nome: 'João Silva',
    contato: '(11) 99999-9999',
    items: [{ id: 1, qtd: 2, valor: 49.90 }],
    tipo_entrega: 'entrega',
    endereco: 'Rua X, 123',
    frete: 15.00,
    metodoPagamento: 'PIX'
  })
})
const { idRastreio } = await orderResponse.json()

// Com autenticação (admin)
const adminResponse = await fetch('/api/usuarios', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
const usuarios = await adminResponse.json()
```

### cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sublime.com","senha":"senha123"}'

# Listar produtos com filtro
curl "http://localhost:3000/api/estoque?linha=FREEZER"

# Criar pedido
curl -X POST http://localhost:3000/api/pedidos \
  -H "Content-Type: application/json" \
  -d '{
    "nome":"João","contato":"(11)99999-9999",
    "items":[{"id":1,"qtd":2,"valor":49.90}],
    "tipo_entrega":"entrega","endereco":"Rua X, 123",
    "frete":15.00,"metodoPagamento":"PIX"
  }'

# Com autenticação
curl http://localhost:3000/api/usuarios \
  -H "Authorization: Bearer eyJhbGc..."
```

### React Hook

```javascript
// lib/api.js
export async function apiCall(endpoint, options = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(localStorage.getItem('auth_token') && {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }),
      ...options.headers
    }
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.erro || 'Erro na requisição')
  }
  
  return response.json()
}

// Uso
const products = await apiCall('/api/estoque?linha=FREEZER')
const pedidos = await apiCall('/api/pedidos', { 
  method: 'POST',
  body: JSON.stringify({ ... })
})
```

---

## 🔒 Autenticação em Requests

Sempre envie o JWT no header `Authorization`:

```http
GET /api/usuarios
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Ou no fetch:

```javascript
fetch('/api/usuarios', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

---

## ⚠️ Erros Comuns

| Status | Motivo | Solução |
|--------|--------|---------|
| 400 | Validação falhou | Verifique corpo da requisição |
| 401 | Token inválido/ausente | Faça login e envie JWT no header |
| 403 | Sem permissão | Verifique se é admin e tem permissão |
| 404 | Recurso não encontrado | Verifique o ID |
| 500 | Erro interno | Veja logs do servidor |

---

## 🚀 Performance

**Recomendações**:
- Pagine resultados grandes (limite 100 por página)
- Use índices de banco (`@@index` no schema)
- Cache em localStorage quando apropriado
- Compacte imagens (Cloudinary otimiza automaticamente)

---

## 📝 Histórico

- **v1.0.0** (25 maio 2026): Primeira versão com todos os endpoints
- 🔄 Atualizações em tempo real conforme novas features saem

---

**Precisa de mais?** Veja [README.md](./README.md) para documentação completa!
