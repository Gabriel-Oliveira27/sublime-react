'use client';
// TurnstileWidget — widget anti-bot do Cloudflare Turnstile.
//
// Uso:
//   const captchaRef = useRef(null);
//   <TurnstileWidget ref={captchaRef} onToken={setCaptchaToken} />
//   ...
//   captchaRef.current?.reset();   // tokens são de uso único — resetar após cada envio
//
// Sem NEXT_PUBLIC_TURNSTILE_SITE_KEY o componente não renderiza nada e
// `captchaAtivo()` devolve false — as telas seguem funcionando sem captcha.
// Setup completo em CAPTCHA-SETUP.md.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

const SITE_KEY   = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** O captcha está habilitado neste ambiente? (chave pública presente) */
export function captchaAtivo() {
  return !!SITE_KEY;
}

let scriptPromise = null;
function loadTurnstileScript() {
  if (typeof window === 'undefined') return Promise.reject();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const s   = document.createElement('script');
    s.src     = SCRIPT_SRC;
    s.async   = true;
    s.defer   = true;
    s.onload  = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error('Turnstile script falhou')); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

const TurnstileWidget = forwardRef(function TurnstileWidget({ onToken, className }, ref) {
  const containerRef = useRef(null);
  const widgetIdRef  = useRef(null);
  const onTokenRef   = useRef(onToken);
  const [loadFailed, setLoadFailed] = useState(false);
  onTokenRef.current = onToken;

  useImperativeHandle(ref, () => ({
    reset() {
      onTokenRef.current?.(null);
      if (widgetIdRef.current !== null && window.turnstile) {
        try { window.turnstile.reset(widgetIdRef.current); } catch { /* widget já removido */ }
      }
    },
  }), []);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || widgetIdRef.current !== null) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey:            SITE_KEY,
          language:           'pt-br',
          theme:              'light',
          callback:           (token) => onTokenRef.current?.(token),
          'expired-callback': () => onTokenRef.current?.(null),
          'error-callback':   () => onTokenRef.current?.(null),
        });
      })
      .catch(() => { if (!cancelled) setLoadFailed(true); });

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* já removido */ }
        widgetIdRef.current = null;
      }
    };
  }, []);

  if (!SITE_KEY) return null;

  if (loadFailed) {
    return (
      <p className={className} style={{ fontSize: '.8rem', color: 'var(--warning)' }}>
        Não foi possível carregar a verificação de segurança. Desative bloqueadores
        de conteúdo para esta página ou tente novamente mais tarde.
      </p>
    );
  }

  return <div ref={containerRef} className={className} />;
});

export default TurnstileWidget;
