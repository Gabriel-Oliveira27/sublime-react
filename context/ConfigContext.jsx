'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { pixConfigDoPublic, PIX_TAXA_CONFIG_VAZIO } from '@/lib/pixFee';

const DEFAULT_FRETE = {
  modelo: 'VALOR',
  tiersValor: [
    { ate: 129, taxa: 0 }, { ate: 200, taxa: 1.50 }, { ate: 270, taxa: 3.00 },
    { ate: 349, taxa: 5.00 }, { ate: 419, taxa: 7.00 }, { ate: null, taxa: 10.00 },
  ],
  origemLat: null, origemLon: null,
  origemEndereco: '', origemCep: '', origemCidade: '', origemUF: '',
  custoKm: 1.50, freteGratisAteKm: 0,
  valorFixo: 0, valorCidadeOrigem: 0, valorDemais: 0, cidadesEspeciais: [],
};

const DEFAULTS = {
  whatsapp:        '',
  descontoGlobal:  0,
  descontoLinhas:  { FREEZER:0, AQUECER:0, CONSERVAR:0, PREPARAR:0, SERVIR:0, ARMAZENAR:0 },
  whatsappAtivo:     true,
  pagamentoPix:      true,
  pagamentoCredito:  true,
  pagamentoDinheiro: true,
  pixOnline:         PIX_TAXA_CONFIG_VAZIO,
  pixTaxaFrase:      '',
  recebimento:       { entrega: true, retirada: true },
  retiradaHorario:   { inicio: '08:00', fim: '19:00' },
  frete: DEFAULT_FRETE,
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
          whatsapp:       typeof data.whatsapp === 'string' ? data.whatsapp : '',
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
          pixOnline:         pixConfigDoPublic(data),
          pixTaxaFrase:      typeof data.pix_taxa_frase === 'string' ? data.pix_taxa_frase : '',
          recebimento: {
            entrega:  data.recebimento_entrega  !== 'false',
            retirada: data.recebimento_retirada !== 'false',
          },
          retiradaHorario: {
            inicio: data.retirada_hora_inicio || '08:00',
            fim:    data.retirada_hora_fim    || '19:00',
          },
          // Frete vem como objeto completo — mantém defaults para campos ausentes
          frete: data.frete ? { ...DEFAULT_FRETE, ...data.frete } : DEFAULT_FRETE,
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

export function useDiscount(linha) {
  const { descontoGlobal, descontoLinhas } = useConfig();
  if (linha && descontoLinhas[linha] > 0) return descontoLinhas[linha];
  return descontoGlobal;
}
