// Helpers de Web Push do LADO DO CLIENTE (loja).
// Registro do service worker, assinatura de push e os "pings" que alimentam
// as notificações de pedido e o lembrete de carrinho abandonado.

const SW_URL = '/sw.js';

export function pushSuportado() {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;
}

export async function registrarSW() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(SW_URL);
  } catch (e) {
    console.warn('[pwa] falha ao registrar SW:', e);
    return null;
  }
}

function base64UrlParaUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Assinatura atual do navegador (ou null). */
export async function obterAssinatura() {
  if (!pushSuportado()) return null;
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

/**
 * Garante permissão + assinatura de push registrada no servidor.
 * Chamar a partir de um gesto do usuário (clique) para o prompt de permissão.
 * @returns {Promise<PushSubscription|null>}
 */
export async function ativarNotificacoes(escopo = 'cliente') {
  if (!pushSuportado()) return null;

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return null;

  const reg = (await navigator.serviceWorker.getRegistration(SW_URL)) || (await registrarSW());
  if (!reg) return null;
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const res = await fetch('/api/push/vapid').then((r) => r.json()).catch(() => null);
    if (!res?.key) return null; // servidor sem VAPID configurado
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlParaUint8Array(res.key),
    });
  }

  const ok = await fetch('/api/push/web', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON(), escopo }),
  }).then((r) => r.ok).catch(() => false);

  return ok ? sub : null;
}

/** Vincula um pedido à assinatura — passa a receber o status por push. */
export async function acompanharPedido(orderId) {
  const sub = await obterAssinatura();
  if (!sub) return false;
  return fetch('/api/push/web/pedido', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint, orderId }),
  }).then((r) => r.ok).catch(() => false);
}

/** Informa ao servidor o estado do carrinho (para o lembrete de abandono). */
export async function pingCarrinho(qtd) {
  const sub = await obterAssinatura();
  if (!sub) return;
  fetch('/api/push/web/carrinho', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint, qtd }),
    keepalive: true, // sobrevive à navegação/fechamento da aba
  }).catch(() => {});
}

/** Agenda/cancela o lembrete LOCAL de carrinho (timer dentro do SW). */
export async function agendarLembreteLocal(temItens, delayMs = 10 * 60 * 1000) {
  if (!pushSuportado() || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg?.active) return;
  reg.active.postMessage(
    temItens
      ? { type: 'agendar-lembrete-carrinho', delayMs }
      : { type: 'cancelar-lembrete-carrinho' }
  );
}
