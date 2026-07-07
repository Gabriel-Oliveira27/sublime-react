# PWA + Notificações Push (loja e dashboard)

A loja agora é um **PWA instalável**: o cliente pode adicionar à tela inicial
("Instalar app" no Chrome/Android; "Adicionar à Tela de Início" no iOS) e
receber **notificações** sobre o pedido. O dashboard (repo próprio) também tem
PWA e recebe push de novo pedido/pagamento igual ao APK.

## O que o cliente recebe

| Evento | Notificação |
| --- | --- |
| Pagamento confirmado (PIX online, webhook) | "Seu pagamento foi confirmado!" + "esperar chegar" ou "ir retirar" conforme entrega/retirada |
| Pagamento confirmado manualmente no dashboard/app | idem |
| Etapa → EM_PREPARO | "Pedido em separação" |
| Etapa → SAIU_PARA_ENTREGA | "Saiu para entrega!" (ou "pronto para retirada") |
| Etapa → ENTREGUE / CANCELADO / CONFIRMADO | mensagens equivalentes |
| Carrinho parado há 10 min com itens | "Seu carrinho ainda está aqui! Conclua sua compra com os melhores preços da região." |

O cliente ativa as notificações no **modal de sucesso do pedido** (botão
"Ativar"). Se já autorizou antes, cada novo pedido é vinculado automaticamente.

## Variáveis de ambiente (obrigatórias para o push)

Adicione no Vercel (loja) — sem elas o site funciona normal, só não envia push:

```
VAPID_PUBLIC_KEY=   # chave pública VAPID
VAPID_PRIVATE_KEY=  # chave privada VAPID (SECRETA)
VAPID_SUBJECT=mailto:seu-email@exemplo.com
CRON_SECRET=        # opcional: protege a rota do lembrete de carrinho
```

Gerar um par de chaves (uma única vez): `npx web-push generate-vapid-keys`.
As chaves já foram geradas e adicionadas ao seu `.env` local — copie de lá.

## Lembrete de carrinho abandonado

Dois mecanismos, complementares:

1. **Timer local no service worker** — cobre aba aberta/minimizada. Funciona
   sem configuração extra (exige permissão de notificação concedida).
2. **Rota de cron `GET /api/push/web/lembrete-carrinho`** — cobre aba/app
   fechados. Precisa de um agendador chamando a rota a cada 5–10 min:
   - **Vercel Cron** (plano Pro) em `vercel.json`:
     `{"crons":[{"path":"/api/push/web/lembrete-carrinho","schedule":"*/10 * * * *"}]}`
     (no plano Hobby o Vercel Cron só roda 1x/dia — não serve para isso);
   - ou um serviço gratuito tipo **cron-job.org** apontando para
     `https://SEU-DOMINIO/api/push/web/lembrete-carrinho` com o header
     `Authorization: Bearer SEU_CRON_SECRET` (se `CRON_SECRET` estiver setado).

É enviado **um** lembrete por "sessão" de carrinho — mexer no carrinho de novo
reabilita o próximo.

## Arquitetura (para manutenção)

- `prisma/schema.prisma` → tabela `WebPushSub` (endpoint + chaves + escopo
  `cliente`/`vendedor` + pedidos acompanhados + estado do carrinho).
- `lib/webpush.ts` → envio server-side (pacote `web-push`); remove assinaturas
  mortas (404/410) automaticamente.
- `lib/push.ts` → `sendPushToAll` agora atinge APK (Expo) **e** dashboards PWA.
- `lib/pushClient.js` → lado do navegador (assinar, vincular pedido, ping de
  carrinho, lembrete local).
- `components/pwa/PwaProvider.jsx` → registra o SW e observa o carrinho.
- `public/sw.js` → service worker (push, clique, timer local do carrinho).
- `app/manifest.ts` → manifest do PWA.
- Rotas: `/api/push/vapid`, `/api/push/web` (registrar/remover),
  `/api/push/web/pedido` (vincular pedido), `/api/push/web/carrinho` (ping),
  `/api/push/web/lembrete-carrinho` (cron).

## Dashboard (PWA do vendedor)

No repo do dashboard: manifest + SW próprios e botão "Ativar notificações" nas
configurações. A assinatura é registrada na API da loja com escopo `vendedor`
(rota `/api/push/web`, autenticada via cookie de sessão + CORS). Todo push de
"novo pedido"/"pagamento confirmado" que já ia para o APK agora também chega no
navegador/PWA do dashboard.

## iOS — observação

No iPhone, web push só funciona com o site **instalado na Tela de Início**
(iOS 16.4+). No Android/desktop funciona direto no navegador.
