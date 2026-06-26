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
  return slugify(group.descricao) + (group.litros ? '-' + slugify(String(group.litros)) : '');
}

/* ─── SHIPPING ─── */

/**
 * Normaliza nome de cidade para comparação fuzzy.
 * Remove acentos, maiúsculas, pontuação e espaços extras.
 */
export function normalizeCity(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcula frete com base no modelo configurado no banco (FreteConfig).
 *
 * @param subtotal      Valor total dos produtos (usado em VALOR)
 * @param distanceKm    Distância em km (usado em KM; pode ser null nos outros modelos)
 * @param destCity      Nome da cidade de destino vindo do ViaCEP (usado em CIDADE)
 * @param dynamicConfig Objeto do ConfigContext — campo `frete` contém o FreteConfig
 *
 * Retorna: { cost: number | 'pending', note: string }
 *   cost 'pending' = valor a combinar com o vendedor
 */
export function computeShippingCost(subtotal, distanceKm, destCity, dynamicConfig = null) {
  const frete = dynamicConfig?.frete;

  if (!frete) return _fallback(subtotal, destCity);

  switch (frete.modelo) {

    // ── FIXO: um valor único para qualquer entrega ─────────────────────────
    case 'FIXO': {
      const cost = parseFloat(frete.valorFixo) || 0;
      return { cost, note: cost === 0 ? 'Frete grátis!' : '' };
    }

    // ── VALOR: tiers por valor do carrinho ─────────────────────────────────
    case 'VALOR': {
      const tiers = Array.isArray(frete.tiersValor) ? frete.tiersValor : [];
      if (!tiers.length) return _fallback(subtotal, destCity);

      // Ordena crescente por `ate` (null = sem limite, vai por último)
      const sorted = [...tiers].sort((a, b) => {
        if (a.ate == null) return  1;
        if (b.ate == null) return -1;
        return a.ate - b.ate;
      });

      const tier = sorted.find(t => t.ate == null || subtotal <= t.ate);
      if (!tier) return { cost: 'pending', note: 'Faixa de frete não configurada para este valor.' };

      const cost = parseFloat(tier.taxa) || 0;
      return { cost, note: cost === 0 ? 'Frete grátis!' : '' };
    }

    // ── KM: custo por distância ────────────────────────────────────────────
    case 'KM': {
      if (distanceKm == null || isNaN(distanceKm)) {
        return { cost: 'pending', note: 'Calcule o frete pelo CEP para ver o valor.' };
      }
      const gratisAte = parseFloat(frete.freteGratisAteKm) || 0;
      if (gratisAte > 0 && distanceKm <= gratisAte) {
        return { cost: 0, note: 'Frete grátis!' };
      }
      const cost = +(distanceKm * (parseFloat(frete.custoKm) || 1.50)).toFixed(2);
      return { cost, note: `Distância: ${distanceKm.toFixed(1)} km` };
    }

    // ── CIDADE: valor fixo por cidade, diferente para outras ──────────────
    case 'CIDADE': {
      const dest     = normalizeCity(destCity);
      const origem   = normalizeCity(frete.origemCidade || CONFIG.ORIGIN.CITY);

      if (!dest) return { cost: 'pending', note: 'Informe o CEP para calcular.' };

      // Verifica cidades especiais primeiro (lista personalizada)
      const especiais = Array.isArray(frete.cidadesEspeciais) ? frete.cidadesEspeciais : [];
      const especial  = especiais.find(c => normalizeCity(c.nome) === dest);
      if (especial) {
        const cost = parseFloat(especial.valor) || 0;
        return { cost, note: cost === 0 ? 'Frete grátis!' : '' };
      }

      // Cidade de origem = valor preferencial
      if (dest === origem) {
        const cost = parseFloat(frete.valorCidadeOrigem) || 0;
        return { cost, note: cost === 0 ? 'Frete grátis!' : '' };
      }

      // Demais cidades
      const cost = parseFloat(frete.valorDemais) || 0;
      return { cost, note: cost === 0 ? 'Frete grátis!' : '' };
    }

    default:
      return _fallback(subtotal, destCity);
  }
}

/** Fallback: CONFIG.SHIPPING_TIERS hardcoded (usado se FreteConfig ainda não existe) */
function _fallback(subtotal, destCity) {
  const originCity = normalizeCity(CONFIG.ORIGIN.CITY);
  const dest       = normalizeCity(destCity);
  if (dest && dest !== originCity) {
    return { cost: 'pending', note: 'Frete a combinar com o vendedor.' };
  }
  const tier = CONFIG.SHIPPING_TIERS.find(t => t.maxSubtotal === null || subtotal <= t.maxSubtotal);
  const cost = tier ? tier.cost : 10;
  return { cost, note: cost === 0 ? 'Frete grátis!' : '' };
}

export function haversine(lat1, lon1, lat2, lon2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    = Math.sin(dLat/2)**2 +
               Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
