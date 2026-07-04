# PIX online (Mercado Pago) — setup e testes

Feature da branch `pix`: o cliente escolhe no checkout entre **pagar agora (PIX
instantâneo, com confirmação automática)** e **pagar na retirada/entrega (sem
taxa)**. O PIX instantâneo gera **QR Code + copia-e-cola** e pode cobrar uma
**taxa de serviço** configurável.

Roda **localmente em modo MOCK** sem precisar do Mercado Pago — você só pluga o
token quando quiser. `tsc` e `next build` passam limpos.

---

## 1. Rodar e testar localmente (modo mock, sem Mercado Pago)

```bash
# 1. Aplicar os novos campos do Pedido no banco (ADITIVO e seguro — colunas com
#    default/nullable: pixOnline, taxaServico, pspPaymentId).
#    Use db push para teste rápido, ou migrate dev para gerar a migration versionada.
npx prisma db push
#    (alternativa versionada: npx prisma migrate dev --name pix_online)

# 2. Ligar o PIX online no banco com uma taxa de exemplo (1,99%):
npx tsx scripts/pix-config-local.ts

# 3. Subir a loja:
npm run dev
```

Fluxo de teste: adicione um produto → checkout → método **PIX** → escolha
**"Pagar agora (instantâneo)"**. Ao confirmar, aparece o **QR + copia-e-cola** e
uma contagem de **10 min**. Como não há Mercado Pago configurado, aparece o botão
**"Simular pagamento (teste)"** — clique nele e a tela vira **"Pagamento
confirmado!"** (é o mesmo caminho que o webhook real dispara).

> ⚠️ O `prisma db push` usa a `DATABASE_URL` do seu `.env`. Se ela apontar para o
> banco de produção, as colunas serão criadas lá também (é aditivo/seguro, mas
> fica o aviso). Para testar isolado, use um banco de desenvolvimento.

---

## 2. Ligar o Mercado Pago de verdade (quando quiser)

1. Copie as variáveis de `.env.pix.example` para o seu `.env` e preencha
   `MP_ACCESS_TOKEN` (comece pelas credenciais de **teste**) e `MP_WEBHOOK_SECRET`.
2. No painel do Mercado Pago, configure o **webhook** apontando para
   `https://SEU-DOMINIO/api/webhooks/mercadopago`.
3. Pronto: assim que o `MP_ACCESS_TOKEN` existe, o modo mock some sozinho e o app
   passa a gerar cobranças reais. O botão "Simular pagamento" também desaparece.

---

## 3. Configuração (feita pelo dashboard — chaves prontas na API)

As chaves já existem no `Config` e são lidas/gravadas por `/api/config/vendas`
(escrita exige permissão `config`) e expostas à loja por `/api/config/public`:

| Chave | O que faz |
|-------|-----------|
| `PIX_ONLINE_ATIVO` | `true`/`false` — liga o "pagar agora" |
| `PIX_TAXA_MODO` | `NULA` (sem taxa) · `FIXA` (uma taxa) · `FAIXAS` (taxa por valor mínimo de compra) |
| `PIX_TAXA_FIXA` | `{"tipo":"PERCENT"|"REAIS","valor":n}` |
| `PIX_TAXA_FAIXAS` | `[{"min":n,"tipo":"PERCENT"|"REAIS","valor":n}, ...]` |

> **Pendente:** os controles visuais disso no **dashboard** e no **app** ainda não
> foram feitos — é a próxima fatia. Por ora, use o `scripts/pix-config-local.ts`
> (ou insira as linhas no `Config`) para testar.

---

## 4. Segurança (anti-manipulação)

- **Taxa e total são 100% recalculados no servidor** (`app/api/pedidos/route.ts`),
  a partir do preço do banco e do `Config` — o `total`/flag do cliente é ignorado.
- A flag `payment.online` do cliente **só** tem efeito se `PIX_ONLINE_ATIVO` estiver
  ligado no banco. Mandar `online:true` com a feature desligada não adiciona taxa
  nem muda nada.
- O pedido só é marcado **pago** pelo webhook, que **valida a assinatura** do MP e
  **reconsulta o status direto na API do MP** (nunca confia no corpo da
  notificação) e confere se o **valor bate**. É idempotente. Nenhuma rota do
  cliente marca pedido como pago.
- Status público (`/api/pagamentos/pix/status`) devolve só "pago: sim/não".
- `/api/pagamentos/pix/simular` só funciona em modo mock/dev (some com o token real).

---

## 5. Respostas às suas dúvidas

- **A taxa é da transferência ou da geração?** Da **transferência** (quando o
  dinheiro efetivamente cai). Gerar QR/cobrança não custa nada — QRs não pagos ou
  expirados não geram taxa. Por isso a "taxa de conveniência" que você cobra do
  cliente serve para **cobrir** o MDR que o Mercado Pago desconta no recebimento.
- **QR e copia-e-cola durando 10 min:** sim, válido e já implementado. Os dois vêm
  da **mesma** cobrança, então expiram juntos em 10 minutos (`date_of_expiration`
  no MP; contador na tela).

---

## Arquivos principais

- Cálculo da taxa (compartilhado): `lib/pixFee.js`
- Provedor PIX (mock + Mercado Pago) + QR + leitura de config: `lib/pix.ts`
- Confirmação de pagamento (ponto único): `lib/pixConfirm.ts`
- Rotas: `app/api/pedidos/route.ts` (gera a cobrança), `app/api/webhooks/mercadopago/route.ts`,
  `app/api/pagamentos/pix/status/route.ts`, `app/api/pagamentos/pix/simular/route.ts`
- Config: `app/api/config/vendas/route.ts`, `app/api/config/public/route.ts`
- Frontend: `app/checkout/page.jsx`, `components/checkout/OrderSummary.jsx`,
  `components/checkout/SuccessModal.jsx`, `context/ConfigContext.jsx`
