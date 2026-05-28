// components/store/VariationsModal.jsx
'use client';
import { useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { applyDiscount, parseImages } from '@/lib/utils';
import ProductImageCarousel from './ProductImageCarousel';
import ProductDescription from './ProductDescription';
import styles from './VariationsModal.module.css';

export default function VariationsModal({ group, onClose }) {
  const { add } = useCart();
  const { showToast } = useToast();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  if (!group) return null;

  const handleAdd = (variation) => {
    add(variation);
    showToast('Produto adicionado ao carrinho!', 'success');
    onClose();
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{group.descricao}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className={styles.body}>
          <ProductDescription detalhes={group.variations[0]?.detalhes} />
          <div className={styles.grid}>
            {group.variations.map((v, i) => {
              const calc = applyDiscount(v.valor);
              const images = parseImages(v.imagem);
              return (
                <div key={i} className={styles.card}>
                  <ProductImageCarousel images={images} alt={v.cores || v.descricao} />
                  {v.cores && <div className={styles.color}><span>{v.cores}</span></div>}
                  <div className={styles.info}>
                    {v.filtros && <div>🏷️ {v.filtros}</div>}
                    <div>📦 Estoque: {v.qtd}</div>
                  </div>
                  {calc.hasDiscount ? (
                    <>
                      <span className={styles.priceOld}>R$ {calc.originalPrice.toFixed(2)}</span>
                      <span className={styles.price}>R$ {calc.finalPrice.toFixed(2)}</span>
                      <span className={styles.discBadge}>{calc.discount}% OFF</span>
                    </>
                  ) : (
                    <span className={styles.price}>R$ {parseFloat(v.valor).toFixed(2)}</span>
                  )}
                  <button className={styles.btn} onClick={() => handleAdd(v)}>
                    Adicionar ao Carrinho
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
