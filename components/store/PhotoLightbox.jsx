// components/store/PhotoLightbox.jsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { PLACEHOLDER_IMG } from '@/lib/utils';
import styles from './PhotoLightbox.module.css';

export default function PhotoLightbox({ images = [], startIdx = 0, onClose }) {
  const [idx, setIdx] = useState(startIdx);
  const list = images.length ? images : [PLACEHOLDER_IMG];
  const onErr = e => { e.target.onerror = null; e.target.src = PLACEHOLDER_IMG; };

  const prev = useCallback(() => setIdx(i => (i - 1 + list.length) % list.length), [list.length]);
  const next = useCallback(() => setIdx(i => (i + 1) % list.length), [list.length]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handler = e => {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', handler); };
  }, [onClose, prev, next]);

  return (
    <div
      className={styles.overlay}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog" aria-modal="true" aria-label="Visualizador de fotos"
    >
      {/* Botão fechar */}
      <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      {/* Contador */}
      <span className={styles.counter}>{idx + 1} / {list.length}</span>

      {/* Seta esquerda */}
      {list.length > 1 && (
        <button className={`${styles.nav} ${styles.navPrev}`} onClick={prev} aria-label="Foto anterior">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      )}

      {/* Imagem principal */}
      <div className={styles.imgWrap}>
        <img
          key={idx}
          src={list[idx]}
          alt={`Foto ${idx + 1}`}
          className={styles.img}
          onError={onErr}
        />
      </div>

      {/* Seta direita */}
      {list.length > 1 && (
        <button className={`${styles.nav} ${styles.navNext}`} onClick={next} aria-label="Próxima foto">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      )}

      {/* Tira de thumbnails */}
      {list.length > 1 && (
        <div className={styles.strip}>
          {list.map((url, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`${styles.thumb} ${i === idx ? styles.thumbActive : ''}`}
              aria-label={`Ver foto ${i + 1}`}
            >
              <img src={url} alt="" onError={onErr} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
