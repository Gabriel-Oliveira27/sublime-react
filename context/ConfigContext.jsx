// context/ConfigContext.jsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const DEFAULTS = {
  descontoGlobal:     0,
  descontoLinhas:     { FREEZER:0, AQUECER:0, CONSERVAR:0, PREPARAR:0, SERVIR:0, ARMAZENAR:0 },
  whatsappAtivo:      true,
  pagamentoPix:       true,
  pagamentoCredito:   true,
  pagamentoDinheiro:  true,
  loaded:             false,
};

const ConfigContext = createContext(DEFAULTS);

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULTS);

  useEffect(() => {
    fetch('/api/config/public')
      .then(r => r.json())
      .then(data => {
        setConfig({
          descontoGlobal:    Math.max(0, Math.min(100, parseInt(data.desconto_global) || 0)),
          descontoLinhas: {
            FREEZER:   Math.max(0, parseInt(data.desconto_linhas?.FREEZER)   || 0),
            AQUECER:   Math.max(0, parseInt(data.desconto_linhas?.AQUECER)   || 0),
            CONSERVAR: Math.max(0, parseInt(data.desconto_linhas?.CONSERVAR) || 0),
            PREPARAR:  Math.max(0, parseInt(data.desconto_linhas?.PREPARAR)  || 0),
            SERVIR:    Math.max(0, parseInt(data.desconto_linhas?.SERVIR)    || 0),
            ARMAZENAR: Math.max(0, parseInt(data.desconto_linhas?.ARMAZENAR) || 0),
          },
          whatsappAtivo:     data.whatsapp_ativo     !== 'false',
          pagamentoPix:      data.pagamento_pix      !== 'false',
          pagamentoCredito:  data.pagamento_credito  !== 'false',
          pagamentoDinheiro: data.pagamento_dinheiro !== 'false',
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

/** Hook para consumir as configurações em qualquer componente */
export const useConfig = () => useContext(ConfigContext);

/**
 * Retorna o percentual de desconto correto para um produto de uma linha.
 * Prioridade: desconto de linha > desconto global > 0
 */
export function useDiscount(linha) {
  const { descontoGlobal, descontoLinhas } = useConfig();
  if (linha && descontoLinhas[linha] > 0) return descontoLinhas[linha];
  return descontoGlobal;
}
