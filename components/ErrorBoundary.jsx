'use client';
/**
 * components/ErrorBoundary.jsx
 *
 * Captura erros de render do React e exibe uma tela de fallback
 * em vez de deixar a página inteira em branco para o cliente.
 *
 * Uso no layout.jsx:
 *   import ErrorBoundary from '@/components/ErrorBoundary';
 *   <ErrorBoundary> {children} </ErrorBoundary>
 *
 * ErrorBoundary só funciona como class component — não há hook equivalente.
 */

import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message ?? 'Erro desconhecido' };
  }

  componentDidCatch(error, info) {
    // Troca por Sentry.captureException(error, { extra: info }) se usar Sentry
    console.error('[ErrorBoundary]', error, info?.componentStack ?? '');
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        background: '#fafafa',
        color: '#333',
        textAlign: 'center',
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
          stroke="#c0392b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
          Algo deu errado
        </h1>
        <p style={{ margin: 0, fontSize: '.9rem', color: '#666', maxWidth: '380px' }}>
          Ocorreu um erro inesperado. Tente recarregar a página. Se o problema
          persistir, entre em contato com o suporte.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '.5rem',
            padding: '.6rem 1.5rem',
            borderRadius: '8px',
            border: 'none',
            background: '#7c3aed',
            color: '#fff',
            fontSize: '.9rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Recarregar página
        </button>
      </div>
    );
  }
}
