// Cálculo da TAXA DE SERVIÇO do PIX instantâneo (online).
//
// Este arquivo é compartilhado entre a loja (checkout, só para EXIBIR a taxa) e
// a API (que a recalcula e é a fonte de verdade — o valor exibido no cliente é
// meramente informativo; quem cobra é o servidor). Mantê-lo em .js permite
// importar tanto do frontend (JSX) quanto das rotas (TS).
//
// Formato do config (vindo do banco / dashboard):
//   { ativo: boolean,
//     modo: 'NULA' | 'FIXA' | 'FAIXAS',
//     fixa:   { tipo: 'PERCENT' | 'REAIS', valor: number },
//     faixas: [ { min: number, tipo: 'PERCENT' | 'REAIS', valor: number }, ... ] }

/** @typedef {{ tipo: 'PERCENT'|'REAIS', valor: number }} Taxa */
/** @typedef {{ ativo: boolean, modo: 'NULA'|'FIXA'|'FAIXAS', fixa: Taxa, faixas: (Taxa & {min:number})[] }} PixTaxaConfig */

export const PIX_TAXA_CONFIG_VAZIO = /** @type {PixTaxaConfig} */ ({
  ativo: false,
  modo: 'NULA',
  fixa: { tipo: 'PERCENT', valor: 0 },
  faixas: [],
});

/** Aplica uma taxa (percentual ou em reais) sobre uma base. Nunca negativa. */
function aplicar(base, taxa) {
  const valor = Number(taxa?.valor) || 0;
  if (valor <= 0) return 0;
  const t = taxa?.tipo === 'REAIS' ? valor : (Number(base) || 0) * (valor / 100);
  return Math.max(0, Math.round(t * 100) / 100);
}

/**
 * Calcula a taxa de serviço em reais para um dado valor-base (o total a pagar).
 * @param {number} base  Total do pedido (subtotal − desconto + frete).
 * @param {PixTaxaConfig} cfg
 * @returns {number} taxa em reais (0 se desligado/sem taxa).
 */
export function calcularTaxaPix(base, cfg) {
  if (!cfg || !cfg.ativo || cfg.modo === 'NULA') return 0;

  if (cfg.modo === 'FIXA') return aplicar(base, cfg.fixa);

  if (cfg.modo === 'FAIXAS') {
    const faixas = Array.isArray(cfg.faixas) ? cfg.faixas : [];
    // Escolhe a faixa de maior `min` cujo mínimo é atingido pela base.
    const faixa = faixas
      .filter((f) => (Number(base) || 0) >= (Number(f?.min) || 0))
      .sort((a, b) => (Number(b?.min) || 0) - (Number(a?.min) || 0))[0];
    return faixa ? aplicar(base, faixa) : 0;
  }

  return 0;
}

/** Faz o parse seguro de um JSON de config (string) para objeto, com fallback. */
export function parseJsonSeguro(raw, fallback) {
  if (raw == null) return fallback;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(String(raw)); } catch { return fallback; }
}

/**
 * Monta o PixTaxaConfig a partir da resposta de /api/config/public
 * (chaves em snake_case). Usado pela loja para exibir a taxa.
 * @returns {PixTaxaConfig}
 */
export function pixConfigDoPublic(data) {
  return {
    ativo: data?.pix_online_ativo === 'true' || data?.pix_online_ativo === true,
    modo: ['NULA', 'FIXA', 'FAIXAS'].includes(data?.pix_taxa_modo) ? data.pix_taxa_modo : 'NULA',
    fixa: parseJsonSeguro(data?.pix_taxa_fixa, { tipo: 'PERCENT', valor: 0 }),
    faixas: parseJsonSeguro(data?.pix_taxa_faixas, []),
  };
}
