# Captcha (Cloudflare Turnstile) — Setup

Proteção anti-bot/spam nas duas portas públicas mais sensíveis da loja:

- **Rastreio de pedidos** (`/compras` → `GET /api/pedidos/rastrear`) — impede
  varredura automatizada de VDs sequenciais e tentativas de CPF em massa.
- **Checkout** (`/checkout` → `POST /api/pedidos`) — impede criação de pedidos
  falsos em massa (que travariam estoque real, já que o pedido decrementa
  `qtd` na reserva).

O Turnstile foi escolhido por ser **gratuito, sem limite de requisições,
invisível para a grande maioria dos usuários** (sem "selecione as faixas de
pedestre") e compatível com LGPD (não usa cookies de rastreamento).

## Como ativar

1. Crie uma conta gratuita em <https://dash.cloudflare.com/> e abra
   **Turnstile** no menu lateral.
2. **Add widget** → informe o(s) domínio(s) da loja (ex.:
   `sublime-react.vercel.app` e o domínio próprio). Modo: **Managed**
   (recomendado).
3. Copie as duas chaves geradas e configure as variáveis de ambiente
   (na Vercel: *Settings → Environment Variables*):

   | Variável | Onde vive | Valor |
   |---|---|---|
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | pública (embutida no bundle) | Site Key |
   | `TURNSTILE_SECRET_KEY` | somente servidor | Secret Key |

4. Faça um novo deploy (a chave pública entra no build).

## Comportamento

- **Sem as chaves** o captcha fica totalmente desligado: os widgets não
  renderizam e a API não exige token. Dev local e instâncias whitelabel ainda
  não configuradas continuam funcionando sem mudanças.
- **Com as chaves**, o widget aparece no formulário de rastreio e na etapa de
  pagamento do checkout. O token é validado **no servidor** a cada requisição
  (tokens são de uso único; o front renova automaticamente após cada envio).
- **Sessão staff autenticada** (dashboard/app do vendedor) dispensa o captcha
  no `POST /api/pedidos` — pedidos manuais continuam funcionando.
- **Fail-open só para indisponibilidade da Cloudflare**: se o `siteverify` não
  responder (timeout/queda), a requisição passa e o evento é logado — uma
  queda do serviço de captcha não pode parar as vendas. Token ausente ou
  recusado é sempre bloqueado (403). O rate-limit por IP já existente continua
  ativo como segunda camada.

## Teste

Chaves de teste oficiais da Cloudflare (funcionam em `localhost`):

- Site key (sempre passa, invisível): `1x00000000000000000000AA`
- Site key (força desafio interativo): `3x00000000000000000000FF`
- Secret key (sempre aprova): `1x0000000000000000000000000000000AA`
- Secret key (sempre recusa): `2x0000000000000000000000000000000AA`
