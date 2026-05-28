import { CONFIG } from './config';

const BASE = CONFIG.API.VERCEL_URL;

/* ── Produtos ──────────────────────────────────────────────────────────── */

export async function fetchProducts() {
  const res = await fetch(`${BASE}/api/estoque`);
  if (!res.ok) throw new Error(`HTTP ${res.status} ao carregar produtos`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('Formato de dados inválido');

  return data
    .filter(p => Number(p.qtd) > 0)
    .map(p => ({
      id:       p.id,
      descricao: p.produto,          // banco: produto  → front: descricao
      Litros:   p.litros,            // banco: litros   → front: Litros
      cores:    p.cores,
      valor:    parseFloat(p.valor),
      linha:    p.linha,
      imagem:   p.imagem,            // URL Cloudinary
      filtros:  p.filtros,
      detalhes: p.detalhes || null,
      qtd:      p.qtd,
    }));
}

/* ── Pedidos ───────────────────────────────────────────────────────────── */

export async function reserveOrder(orderPayload) {
  const res = await fetch(`${BASE}/api/pedidos`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(orderPayload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.erro || err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  if (data?.erro) throw new Error(data.erro);
  return data; // { success: true, orderId: 'VD-XXX' }
}

export async function trackByCPF(cpf) {
  const clean = cpf.replace(/\D/g, '');
  const res = await fetch(`${BASE}/api/pedidos/rastrear?cpf=${clean}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.erro || `HTTP ${res.status}`);
  }
  return res.json(); // { pedidos: [...] }
}

export async function checkOrder(orderId) {
  const id = orderId.toUpperCase().trim();
  const res = await fetch(`${BASE}/api/pedidos/rastrear?id=${encodeURIComponent(id)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.erro || `HTTP ${res.status}`);
  }
  return res.json(); // { order: {...} }
}

/* ── Cupons ────────────────────────────────────────────────────────────── */

export async function validateCoupon(code) {
  const res = await fetch(`${BASE}/api/cupons/validar?code=${encodeURIComponent(code.toUpperCase().trim())}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.erro || `HTTP ${res.status}`);
  }
  return res.json(); // { valid: true, cupom: { desconto, quantidadeUsos } }
}

export async function consumeCoupon(code) {
  if (!code) return;
  try {
    await fetch(`${BASE}/api/cupons/consumir`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ code: code.toUpperCase().trim() }),
    });
  } catch (err) {
    console.warn('[api] consumeCoupon failed (non-critical):', err.message);
  }
}

/* ── Utilidades ────────────────────────────────────────────────────────── */

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