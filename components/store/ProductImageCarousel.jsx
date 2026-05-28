// components/store/ProductImageCarousel.jsx
'use client';
import { useState, useCallback } from 'react';
import { PLACEHOLDER_IMG } from '@/lib/utils';
import styles from './ProductImageCarousel.module.css';

/**
 * alwaysVisible=false (padrão) → setas/thumbs aparecem só no hover (cards da loja)
 * alwaysVisible=true           → controles sempre visíveis (ProductDetailModal)
 */
export default function ProductImageCarousel({ images = [], alt = '', alwaysVisible = false }) {
  const [idx, setIdx] = useState(0);
  const list = images.length ? images : [PLACEHOLDER_IMG];
  const onErr = e => { e.target.onerror = null; e.target.src = PLACEHOLDER_IMG; };

  const prev = useCallback(() => setIdx(i => (i - 1 + list.length) % list.length), [list.length]);
  const next = useCallback(() => setIdx(i => (i + 1) % list.length), [list.length]);

  // Imagem única: sem carrossel, sem overhead
  if (list.length === 1) {
    return <img src={list[0]} alt={alt} className={styles.img} loading="lazy" onError={onErr} />;
  }

  return (
    <div className={`${styles.wrap} ${alwaysVisible ? styles.alwaysVisible : ''}`}>
      <div className={styles.stage}>
        <button className={`${styles.arrow} ${styles.arrowPrev}`} onClick={prev} aria-label="Foto anterior">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <img key={idx} src={list[idx]} alt={`${alt} — ${idx + 1} de ${list.length}`}
          className={styles.img} loading="lazy" onError={onErr} />

        <button className={`${styles.arrow} ${styles.arrowNext}`} onClick={next} aria-label="Próxima foto">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        <span className={styles.counter}>{idx + 1} / {list.length}</span>
      </div>

      <div className={styles.thumbs} role="tablist">
        {list.map((url, i) => (
          <button key={i} role="tab" aria-selected={i === idx}
            className={`${styles.thumb} ${i === idx ? styles.thumbActive : ''}`}
            onClick={() => setIdx(i)} aria-label={`Ver foto ${i + 1}`}>
            <img src={url} alt="" loading="lazy" onError={onErr} />
          </button>
        ))}
      </div>
    </div>
  );
}
