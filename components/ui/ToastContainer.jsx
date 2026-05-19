'use client';
import { useToast } from '@/context/ToastContext';

const ICONS = {
  success: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/>
    </svg>
  ),
  error: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
    </svg>
  ),
  warning: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
    </svg>
  ),
  info: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  ),
};

const TITLES = { success: 'Sucesso!', error: 'Erro', warning: 'Atenção', info: 'Informação' };

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="toast-container" role="region" aria-label="Notificações">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast ${toast.type}${toast.exiting ? ' exit' : ''}`}
          role="alert"
        >
          <div className="toast-icon">{ICONS[toast.type]}</div>
          <div className="toast-content">
            <div className="toast-title">{toast.title || TITLES[toast.type]}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <button className="toast-close" onClick={() => removeToast(toast.id)} aria-label="Fechar">×</button>
        </div>
      ))}
    </div>
  );
}
