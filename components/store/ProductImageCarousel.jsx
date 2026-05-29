'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { PLACEHOLDER_IMG } from '@/lib/utils';
import styles from './ProductImageCarousel.module.css';

/**
 * alwaysVisible  — controles sempre visíveis (página do produto / modal)
 * showThumbs     — mostra tira de miniaturas
 * autoPlayMs     — intervalo do autoplay (ms)
 * onImageClick   — callback chamado com (images, currentIdx) ao clicar na imagem → abre lightbox
 * enableZoom     — zoom CSS no hover da imagem (padrão: false; true na página do produto)
 */
export default function ProductImageCarousel({
  images       = [],
  alt          = '',
  alwaysVisible  = false,
  showThumbs   = false,
  autoPlayMs   = 3200,
  onImageClick = null,
  enableZoom   = false,
}) {
  const [idx,          setIdx]          = useState(0);
  const [hovered,      setHovered]      = useState(false);
  const [imgHovered,   setImgHovered]   = useState(false); // hover na imagem → pausa
  const resumeTimer                     = useRef(null);

  const list  = images.length ? images : [PLACEHOLDER_IMG];
  const multi = list.length > 1;
  const onErr = e => { e.target.onerror = null; e.target.src = PLACEHOLDER_IMG; };

  const prev = useCallback(() => setIdx(i => (i - 1 + list.length) % list.length), [list.length]);
  const next = useCallback(() => setIdx(i => (i + 1) % list.length), [list.length]);

  // Autoplay — pausa quando imgHovered, retoma após 5s quando sai
  useEffect(() => {
    if (!multi) return;
    if (imgHovered) return;                      // parado enquanto mouse na imagem
    if (!hovered && !alwaysVisible) return;      // só roda no hover ou no modal
    const t = setInterval(next, autoPlayMs);
    return () => clearInterval(t);
  }, [hovered, alwaysVisible, multi, next, autoPlayMs, imgHovered]);

  const handleImgEnter = () => {
    clearTimeout(resumeTimer.current);
    setImgHovered(true);
  };
  const handleImgLeave = () => {
    resumeTimer.current = setTimeout(() => setImgHovered(false), 5000);
  };

  // Imagem única: sem markup extra
  if (!multi) {
    return (
      <img
        src={list[0]} alt={alt}
        className={`${styles.img} ${enableZoom ? styles.zoomable : ''}`}
        loading="lazy" onError={onErr}
        onClick={() => onImageClick?.(list, 0)}
        style={onImageClick ? { cursor: 'zoom-in' } : {}}
      />
    );
  }

  return (
    <div
      className={`${styles.wrap} ${alwaysVisible ? styles.alwaysVisible : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={styles.stage}>
        <button className={`${styles.arrow} ${styles.arrowPrev}`} onClick={e => { e.stopPropagation(); prev(); }} aria-label="Foto anterior">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <img
          key={idx}
          src={list[idx]}
          alt={`${alt} — ${idx + 1} de ${list.length}`}
          className={`${styles.img} ${enableZoom ? styles.zoomable : ''} ${imgHovered && enableZoom ? styles.zoomed : ''}`}
          loading="lazy"
          onError={onErr}
          onMouseEnter={handleImgEnter}
          onMouseLeave={handleImgLeave}
          onClick={e => { e.stopPropagation(); onImageClick?.(list, idx); }}
          style={onImageClick ? { cursor: 'zoom-in' } : {}}
        />

        <button className={`${styles.arrow} ${styles.arrowNext}`} onClick={e => { e.stopPropagation(); next(); }} aria-label="Próxima foto">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        <span className={styles.counter}>{idx + 1} / {list.length}</span>
      </div>

      {showThumbs && (
        <div className={styles.thumbs} role="tablist">
          {list.map((url, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === idx}
              className={`${styles.thumb} ${i === idx ? styles.thumbActive : ''}`}
              onClick={e => { e.stopPropagation(); setIdx(i); }}
              aria-label={`Ver foto ${i + 1}`}
            >
              <img src={url} alt="" loading="lazy" onError={onErr} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}