'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const DEFAULTS = {
  // Descontos
  descontoGlobal:  0,
  descontoLinhas:  { FREEZER:0, AQUECER:0, CONSERVAR:0, PREPARAR:0, SERVIR:0, ARMAZENAR:0 },
  // Pedidos
  whatsappAtivo:     true,
  pagamentoPix:      true,
  pagamentoCredito:  true,
  pagamentoDinheiro: true,
  // Frete — antes ausentes; a loja usava CONFIG.SHIPPING_TIERS hardcoded
  freteModelo:        'FIXO',
  freteFaixas:        null,
  freteCustoKm:       1.50,
  freteGratisAcimaKm: 0,
  // Origem — antes ausentes; a loja usava CONFIG.ORIGIN.* hardcoded
  origemEndereco: '',
  origemLat:      null,
  origemLon:      null,
  origemCep:      '',
  loaded: false,
};

const ConfigContext = createContext(DEFAULTS);

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULTS);

  useEffect(() => {
    fetch('/api/config/public')
      .then(r => r.json())
      .then(data => {
        setConfig({
          descontoGlobal: clamp(parseInt(data.desconto_global) || 0),
          descontoLinhas: {
            FREEZER:   clamp(parseInt(data.desconto_linhas?.FREEZER)   || 0),
            AQUECER:   clamp(parseInt(data.desconto_linhas?.AQUECER)   || 0),
            CONSERVAR: clamp(parseInt(data.desconto_linhas?.CONSERVAR) || 0),
            PREPARAR:  clamp(parseInt(data.desconto_linhas?.PREPARAR)  || 0),
            SERVIR:    clamp(parseInt(data.desconto_linhas?.SERVIR)    || 0),
            ARMAZENAR: clamp(parseInt(data.desconto_linhas?.ARMAZENAR) || 0),
          },
          whatsappAtivo:     data.whatsapp_ativo     !== 'false',
          pagamentoPix:      data.pagamento_pix      !== 'false',
          pagamentoCredito:  data.pagamento_credito  !== 'false',
          pagamentoDinheiro: data.pagamento_dinheiro !== 'false',
          freteModelo:        data.frete_modelo          || 'FIXO',
          freteFaixas:        data.frete_faixas          || null,
          freteCustoKm:       parseFloat(data.frete_custo_km)        || 1.50,
          freteGratisAcimaKm: parseFloat(data.frete_gratis_acima_km) || 0,
          origemEndereco: data.origem_endereco || '',
          origemLat:      data.origem_lat ? parseFloat(data.origem_lat) : null,
          origemLon:      data.origem_lon ? parseFloat(data.origem_lon) : null,
          origemCep:      data.origem_cep || '',
          loaded: true,
        });
      })
      .catch(() => setConfig(c => ({ ...c, loaded: true })));
  }, []);

  return (
    <ConfigContext.Provider value={config}>
      {children}
    </ConfigContext.Provider>
  );
}

function clamp(n) { return Math.max(0, Math.min(100, n)); }

export const useConfig = () => useContext(ConfigContext);

/**
 * Retorna o desconto correto para um produto de uma linha.
 * Prioridade: desconto de linha específica > desconto global > 0.
 */
export function useDiscount(linha) {
  const { descontoGlobal, descontoLinhas } = useConfig();
  if (linha && descontoLinhas[linha] > 0) return descontoLinhas[linha];
  return descontoGlobal;
}

/**
 * Retorna as faixas de frete parseadas (ou null se não configurado/inválido).
 */
export function useFreteFaixas() {
  const { freteFaixas } = useConfig();
  if (!freteFaixas) return null;
  try {
    const parsed = JSON.parse(freteFaixas);
    return Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}