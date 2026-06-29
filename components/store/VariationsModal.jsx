'use client';
import { useEffect, useMemo, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { applyDiscount, parseImages } from '@/lib/utils';
import { useConfig } from '@/context/ConfigContext';
import { TagIcon, PackageIcon } from '@/components/icons/Icons';
import ProductImageCarousel from './ProductImageCarousel';
import ProductDescription from './ProductDescription';
import styles from './VariationsModal.module.css';

export default function VariationsModal({ group, onClose }) {
  const { add } = useCart();
  const { showToast } = useToast();
  const { descontoGlobal, descontoLinhas } = useConfig();
  
  const discountPct = useMemo(() => {
    if (group?.linha && descontoLinhas[group?.linha] > 0) return descontoLinhas[group?.linha];
    return descontoGlobal;
  }, [group?.linha, descontoLinhas, descontoGlobal]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  // Pré-carrega as imagens das variações e só mostra a grade quando prontas
  // (evita o "card vazio" enquanto o Cloudinary baixa as fotos). Teto de 4s.
  const [imagesReady, setImagesReady] = useState(false);
  useEffect(() => {
    if (!group) return;
    setImagesReady(false);
    const urls = group.variations.flatMap((v) => parseImages(v.imagem)).filter(Boolean);
    if (urls.length === 0) { setImagesReady(true); return; }
    let cancelled = false, done = 0;
    const finish = () => { if (!cancelled && ++done >= urls.length) setImagesReady(true); };
    urls.forEach((u) => { const img = new Image(); img.onload = finish; img.onerror = finish; img.src = u; });
    const t = setTimeout(() => { if (!cancelled) setImagesReady(true); }, 4000);
    return () => { cancelled = true; clearTimeout(t); };
  }, [group]);

  if (!group) return null;

  const handleAdd = (variation) => {
    if (add(variation)) {
      showToast('Produto adicionado ao carrinho!', 'success');
      onClose();
    } else {
      showToast('Estoque insuficiente', 'error');
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{group.descricao}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className={styles.body}>
          {!imagesReady ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '220px' }}>
              <span className="spinner" />
            </div>
          ) : (
          <>
          <ProductDescription detalhes={group.variations[0]?.detalhes} />
          <div className={styles.grid}>
            {group.variations.map((v, i) => {
              const calc = applyDiscount(v.valor, discountPct);
              const images = parseImages(v.imagem);
              return (
                <div key={i} className={styles.card}>
                  <ProductImageCarousel images={images} alt={v.cores || v.descricao} showThumbs={false} alwaysVisible />
                  {v.cores && <div className={styles.color}><span>{v.cores}</span></div>}
                  <div className={styles.info}>
                    {v.filtros && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <TagIcon size={14} /> {v.filtros}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <PackageIcon size={14} /> Estoque: {v.qtd}
                    </div>
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
          </>
          )}
        </div>
      </div>
    </div>
  );
}