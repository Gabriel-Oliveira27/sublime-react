/* Service worker da loja (PWA).
 *
 * Responsabilidades:
 *  - receber web push (status do pedido, lembrete de carrinho) e exibir a notificação;
 *  - abrir/focar a loja ao tocar na notificação;
 *  - lembrete LOCAL de carrinho abandonado (agendado pela página via postMessage,
 *    cobre o caso de aba aberta em segundo plano sem depender de cron no servidor).
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Fetch handler mínimo — mantém o app elegível a instalação sem interferir na rede.
self.addEventListener('fetch', () => {});

const ICON = '/logo/icon-192.png';

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* payload não-JSON */ }

  const title = data.title || 'Sublime';
  const options = {
    body: data.body || '',
    icon: ICON,
    badge: ICON,
    tag: data.tag || undefined,
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        if ('focus' in win) {
          win.navigate(url).catch(() => {});
          return win.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

/* ── Lembrete local de carrinho abandonado ──
 * A página agenda/cancela via postMessage. O timer vive enquanto o SW estiver
 * ativo (aba aberta/minimizada). Com a aba fechada, quem cobre é o push
 * disparado pelo servidor (rota /api/push/web/lembrete-carrinho). */
let cartTimer = null;

self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg.type === 'agendar-lembrete-carrinho') {
    clearTimeout(cartTimer);
    cartTimer = setTimeout(() => {
      self.registration.showNotification('Seu carrinho ainda está aqui!', {
        body: 'Conclua sua compra com os melhores preços da região.',
        icon: ICON,
        badge: ICON,
        tag: 'carrinho-abandonado',
        data: { url: '/' },
      });
    }, msg.delayMs || 10 * 60 * 1000);
  }
  if (msg.type === 'cancelar-lembrete-carrinho') {
    clearTimeout(cartTimer);
    cartTimer = null;
  }
});
