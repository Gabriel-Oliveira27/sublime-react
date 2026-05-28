// components/store/ProductDetailModal.jsx
'use client';
import { useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { applyDiscount, parseImages } from '@/lib/utils';
import ProductImageCarousel from './ProductImageCarousel';
import ProductDescription from './ProductDescription';
import styles from './ProductDetailModal.module.css';

export default function ProductDetailModal({ group, onClose }) {
  const { add } = useCart();
  const { showToast } = useToast();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  if (!group) return null;

  const v    = group.variations[0];
  const calc = applyDiscount(v.valor);
  const imgs = parseImages(v.imagem);

  const handleAdd = () => {
    const result = add(v);
    if (result !== false) {
      showToast('Produto adicionado ao carrinho!', 'success');
      onClose();
    } else {
      showToast('Estoque insuficiente', 'error');
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>

        <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className={styles.layout}>
          {/* Esquerda: imagem / carrossel */}
          <div className={styles.imageCol}>
            <div className={styles.imageWrap}>
              <ProductImageCarousel images={imgs} alt={group.descricao} alwaysVisible />
            </div>
          </div>

          {/* Direita: informações */}
          <div className={styles.infoCol}>
            <div>
              {(group.linha || group.litros || v.cores) && (
                <div className={styles.tags}>
                  {group.linha  && <span className={styles.tag}>{group.linha}</span>}
                  {group.litros && <span className={styles.tag}>{group.litros}</span>}
                  {v.cores      && <span className={styles.tag}>{v.cores}</span>}
                </div>
              )}
              <h2 className={styles.name}>{group.descricao}</h2>
            </div>

            <div className={styles.priceBlock}>
              {calc.hasDiscount ? (
                <>
                  <span className={styles.priceOld}>R$ {calc.originalPrice.toFixed(2)}</span>
                  <div className={styles.priceRow}>
                    <span className={styles.price}>R$ {calc.finalPrice.toFixed(2)}</span>
                    <span className={styles.discBadge}>{calc.discount}% OFF</span>
                  </div>
                </>
              ) : (
                <span className={styles.price}>R$ {parseFloat(v.valor).toFixed(2)}</span>
              )}
              <span className={styles.stock}>
                {v.qtd > 5 ? `${v.qtd} em estoque`
                  : v.qtd > 0 ? `⚠ Últimas ${v.qtd} unidades`
                  : 'Esgotado'}
              </span>
            </div>

            <ProductDescription detalhes={v.detalhes} />

            <button className={styles.addBtn} onClick={handleAdd} disabled={v.qtd === 0}>
              {v.qtd === 0 ? 'Produto Esgotado' : 'Adicionar ao Carrinho'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
