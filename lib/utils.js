import { CONFIG } from './config';

/* ─── PRICING ─── */
export function roundToNinety(price) {
  if (price <= 0) return 0;
  const integer = Math.floor(price);
  const cents   = Math.round((price - integer) * 100);
  return (cents <= 49 ? Math.max(0, integer - 1) : integer) + 0.90;
}

export function applyDiscount(rawPrice, overridePct) {
  const pct      = overridePct ?? CONFIG?.STORE?.DISCOUNT_PERCENT ?? 0;
  const original = parseFloat(String(rawPrice));
  if (!pct || pct <= 0 || isNaN(original) || original <= 0)
    return { hasDiscount: false, originalPrice: original || 0, finalPrice: original || 0, discount: 0 };
  const discounted = original * (1 - pct / 100);
  const finalPrice = roundToNinety(discounted);
  if (finalPrice <= 0 || finalPrice >= original)
    return { hasDiscount: false, originalPrice: original, finalPrice: original, discount: 0 };
  return { hasDiscount: true, originalPrice: original, finalPrice, discount: pct };
}

export function parseCurrency(value) {
  if (value == null) return 0;
  let s = String(value).trim().replace(/[R$\s]/g, '');
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export function formatBRL(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/* ─── VALIDATORS ─── */
export function validateCPF(rawCpf) {
  const cpf = String(rawCpf).replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const calc = len => {
    let s = 0;
    for (let i = 0; i < len; i++) s += parseInt(cpf[i]) * (len + 1 - i);
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(9) === parseInt(cpf[9]) && calc(10) === parseInt(cpf[10]);
}

/* ─── MASKS ─── */
export function applyPhoneMask(value) {
  let v = value.replace(/\D/g, '');
  v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
  v = v.replace(/(\d)(\d{4})$/, '$1-$2');
  return v.substr(0, 15);
}
export function applyCPFMask(value) {
  let v = value.replace(/\D/g, '');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return v.substr(0, 14);
}
export function applyCEPMask(value) {
  let v = value.replace(/\D/g, '');
  v = v.replace(/^(\d{5})(\d)/, '$1-$2');
  return v.substr(0, 9);
}

/* ─── DATE ─── */
export function formatDateBR(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/* ─── IMAGES ─── */
export const PLACEHOLDER_IMG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23f5ede4' width='200' height='200'/%3E%3Ccircle fill='%23d9c9bb' cx='100' cy='85' r='30'/%3E%3Crect fill='%23d9c9bb' x='60' y='120' width='80' height='8' rx='4'/%3E%3Crect fill='%23d9c9bb' x='75' y='135' width='50' height='8' rx='4'/%3E%3C/svg%3E`;
export const PLACEHOLDER_IMG_SMALL = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect fill='%23f5ede4' width='80' height='80'/%3E%3Ccircle fill='%23d9c9bb' cx='40' cy='34' r='12'/%3E%3Crect fill='%23d9c9bb' x='24' y='50' width='32' height='4' rx='2'/%3E%3C/svg%3E`;

export function productImagePath(filename) {
  const clean = String(filename || '').trim();
  if (!clean || clean === 'undefined' || clean === 'null') return PLACEHOLDER_IMG;
  if (['pendente','ok','-',''].includes(clean.toLowerCase())) return PLACEHOLDER_IMG;
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  return PLACEHOLDER_IMG;
}
export function parseImages(raw) {
  const clean = String(raw || '').trim();
  if (clean.startsWith('[')) {
    try {
      const arr = JSON.parse(clean);
      if (Array.isArray(arr) && arr.length) return arr.map(String).filter(Boolean);
    } catch {}
  }
  return [productImagePath(clean)];
}
export function slugify(str) {
  return String(str || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}
export function groupSlug(group) {
  const base = slugify(group.descricao);
  const lit  = group.litros ? '-' + slugify(String(group.litros)) : '';
  return base + lit;
}

/* ─── SHIPPING ─── */

/**
 * Calcula o custo de frete com base na configuração dinâmica vinda do banco.
 *
 * @param subtotal      Valor total dos produtos
 * @param distanceKm    Distância calculada pelo haversine (pode ser null)
 * @param city          Cidade de destino (string)
 * @param dynamicConfig Objeto do ConfigContext (opcional — fallback para hardcoded)
 *
 * Prioridade:
 *   1. dynamicConfig.freteModelo === 'KM'   → custo por km configurado no banco
 *   2. dynamicConfig.freteModelo === 'FIXO' → tabela de faixas salva no banco
 *   3. sem dynamicConfig ou faixas vazias   → CONFIG.SHIPPING_TIERS (hardcoded, fallback)
 */
export function computeShippingCost(subtotal, distanceKm, city, dynamicConfig = null) {
  if (distanceKm == null || isNaN(distanceKm)) {
    return { cost: 'pending', note: '⚠️ Distância ainda não calculada.' };
  }

  // ── Modelo KM (banco) ────────────────────────────────────────────────────
  if (dynamicConfig?.freteModelo === 'KM') {
    const custoKm   = dynamicConfig.freteCustoKm       ?? 1.50;
    const gratisAte = dynamicConfig.freteGratisAcimaKm ?? 0;
    if (gratisAte > 0 && distanceKm <= gratisAte)
      return { cost: 0, note: '🎉 Frete grátis!' };
    return { cost: +(distanceKm * custoKm).toFixed(2), note: '' };
  }

  // ── Modelo FIXO — faixas do banco ────────────────────────────────────────
  if (dynamicConfig?.freteModelo === 'FIXO' && dynamicConfig.freteFaixas) {
    let faixas = null;
    try { faixas = JSON.parse(dynamicConfig.freteFaixas); } catch {}

    if (Array.isArray(faixas) && faixas.length) {
      // Ordena por raio crescente (null = sem limite = última faixa)
      const sorted = [...faixas].sort((a, b) => {
        if (a.raio_km_max == null) return  1;
        if (b.raio_km_max == null) return -1;
        return a.raio_km_max - b.raio_km_max;
      });

      const faixa = sorted.find(f => f.raio_km_max == null || distanceKm <= f.raio_km_max);
      if (faixa) {
        if (faixa.valor === 'combinar')
          return { cost: 'pending', note: faixa.label || '⚠️ Envio será combinado com o vendedor.' };
        const cost = parseFloat(faixa.valor) || 0;
        return { cost, note: cost === 0 ? '🎉 Frete grátis!' : (faixa.label || '') };
      }
      return { cost: 'pending', note: '⚠️ Envio será combinado com o vendedor.' };
    }
  }

  // ── Fallback: CONFIG.SHIPPING_TIERS hardcoded ────────────────────────────
  // Usado apenas quando não há configuração de frete no banco ainda.
  const originCity = CONFIG.ORIGIN.CITY.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const destCity   = (city || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (originCity !== destCity)
    return { cost: 'pending', note: '⚠️ Envio será combinado com o vendedor.' };
  const tier = CONFIG.SHIPPING_TIERS.find(t => t.maxSubtotal === null || subtotal <= t.maxSubtotal);
  const cost = tier ? tier.cost : 10;
  return { cost, note: cost === 0 ? '🎉 Frete grátis!' : '' };
}

export function haversine(lat1, lon1, lat2, lon2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
