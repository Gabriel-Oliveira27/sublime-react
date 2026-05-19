import { CONFIG } from './config';

async function workerPost(action, payload) {
  const res = await fetch(CONFIG.API.WORKER_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action, payload }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const data = await res.json();
  if (data && data.success === false) {
    throw new Error(data.error || data.message || `Erro na ação "${action}"`);
  }
  return data;
}

export async function fetchProducts() {
  const res = await fetch(CONFIG.API.GAS_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} ao carregar produtos`);
  const data = await res.json();
  if (!Array.isArray(data?.produtos)) throw new Error('Formato de dados inválido');
  return data.produtos;
}

export async function reserveOrder(orderPayload) {
  return workerPost('reserveOrder', orderPayload);
}

export async function trackByCPF(cpf) {
  const clean = cpf.replace(/\D/g, '');
  return workerPost('trackByCPF', { cpf: clean });
}

export async function checkOrder(orderId) {
  return workerPost('checkOrder', { orderId: orderId.toUpperCase().trim() });
}

export async function validateCoupon(code) {
  return workerPost('validateCoupon', { code: code.toUpperCase().trim() });
}

export async function consumeCoupon(code) {
  if (!code) return;
  try {
    await workerPost('consumeCoupon', { code: code.toUpperCase().trim() });
  } catch (err) {
    console.warn('[api] consumeCoupon failed (non-critical):', err.message);
  }
}

export async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const res  = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export async function lookupCEP(cep) {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) throw new Error('CEP inválido');
  const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
  if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar CEP`);
  const data = await res.json();
  if (data.erro) throw new Error('CEP não encontrado');
  return data;
}
