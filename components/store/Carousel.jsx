'use client';
import { useState, useEffect, useCallback } from 'react';
import { CONFIG } from '@/lib/config';
import styles from './Carousel.module.css';

export default function Carousel() {
  const [index, setIndex] = useState(0);
  const slides = CONFIG.CAROUSEL_SLIDES;

  const goTo = useCallback((i) => setIndex(i), []);
  const next = useCallback(() => setIndex(p => (p + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setIndex(p => (p - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    const t = setInterval(next, 8000);
    return () => clearInterval(t);
  }, [next]);

  return (
    <section className={styles.container} aria-label="Carrossel de banners">
      <div className={styles.wrapper} style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((slide, i) => (
          <div
            key={i}
            className={styles.slide}
            style={{
              background: slide.bg,
              backgroundImage: `linear-gradient(rgba(0,0,0,.3),rgba(0,0,0,.3)), url('${slide.image}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className={styles.content}>
              <h2>{slide.title}</h2>
              <p>{slide.description}</p>
            </div>
          </div>
        ))}
      </div>

      <button className={`${styles.arrow} ${styles.prev}`} onClick={prev} aria-label="Slide anterior">
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <button className={`${styles.arrow} ${styles.next}`} onClick={next} aria-label="Próximo slide">
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>

      <div className={styles.dots}>
        {slides.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${i === index ? styles.active : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}