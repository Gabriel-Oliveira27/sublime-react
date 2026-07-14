// A loja é servida na mesma origem da API (mesmo app Next), então usamos
// caminhos relativos. Evita CORS e o footgun de o `next dev` local chamar a
// API de produção (mostrando dados de prod e criando pedidos reais).
const BASE = '';

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
      descricao: p.produto,          
      Litros:   p.litros,            
      cores:    p.cores,
      valor:    parseFloat(p.valor),
      linha:    p.linha,
      imagem:   p.imagem,            
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

export async function checkOrder(orderId, captchaToken) {
  const id = orderId.toUpperCase().trim();
  // Token do captcha vai no header (não na URL) para não aparecer em logs.
  const res = await fetch(`${BASE}/api/pedidos/rastrear?id=${encodeURIComponent(id)}`, {
    headers: captchaToken ? { 'X-Captcha-Token': captchaToken } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.erro || `HTTP ${res.status}`);
  }
  return res.json(); // { order: {...} }
}

/* ── Cupons ────────────────────────────────────────────────────────────── */

/* ── PIX online (pagar agora) ──────────────────────────────────────────────── */

/** Consulta se o pedido já foi pago (polling enquanto o QR está na tela). */
export async function getPixStatus(orderId) {
  try {
    const res = await fetch(`${BASE}/api/pagamentos/pix/status?orderId=${encodeURIComponent(orderId)}`);
    if (!res.ok) return { pago: false };
    return await res.json();
  } catch {
    return { pago: false };
  }
}

/** APENAS TESTE LOCAL (modo mock): simula a confirmação do pagamento. */
export async function simularPixPagamento(orderId) {
  try {
    const res = await fetch(`${BASE}/api/pagamentos/pix/simular`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ orderId }),
    });
    return await res.json();
  } catch {
    return { ok: false };
  }
}

export async function validateCoupon(code) {
  const res = await fetch(`${BASE}/api/cupons/validar?code=${encodeURIComponent(code.toUpperCase().trim())}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.erro || `HTTP ${res.status}`);
  }
  return res.json(); // { valid: true, cupom: { desconto, quantidadeUsos } }
}

export async function consumeCoupon(code, orderId) {
  if (!code) return;
  try {
    await fetch(`${BASE}/api/cupons/consumir`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      // orderId permite que o servidor valide que o cupom
      // realmente foi usado neste pedido antes de decrementar.
      body: JSON.stringify({
        code:    code.toUpperCase().trim(),
        orderId: orderId ?? '',
      }),
    });
  } catch (err) {
    console.warn('[api] consumeCoupon failed (non-critical):', err.message);
  }
}

/* ── Utilidades ────────────────────────────────────────────────────────── */

/**
 * fetch com timeout — evita que ViaCEP ou Nominatim pendurem o checkout.
 * @param {string} url
 * @param {RequestInit} opts
 * @param {number} ms  Timeout em ms (padrão 6s)
 */
function fetchWithTimeout(url, opts = {}, ms = 6000) {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...opts, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

export async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const res  = await fetchWithTimeout(url, {}, 6000);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null; // Timeout ou erro de rede — falha silenciosa, não trava o checkout
  }
}

export async function lookupCEP(cep) {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) throw new Error('CEP inválido');
  const res = await fetchWithTimeout(`https://viacep.com.br/ws/${clean}/json/`, {}, 6000);
  if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar CEP`);
  const data = await res.json();
  if (data.erro) throw new Error('CEP não encontrado');
  return data;
}