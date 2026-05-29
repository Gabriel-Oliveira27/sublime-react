'use client';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { applyDiscount, parseImages, groupSlug } from '@/lib/utils';
import ProductImageCarousel from './ProductImageCarousel';
import styles from './ProductCard.module.css';

function PriceDisplay({ group, multi }) {
  const minCalc   = applyDiscount(group.minPrice);
  const firstCalc = applyDiscount(group.variations[0].valor);

  if (multi && group.minPrice !== group.maxPrice) {
    return minCalc.hasDiscount ? (
      <div className={styles.price}>
        <span className={styles.pricePrefix}>A partir de</span>
        <div className={styles.discountWrap}>
          <span className={styles.priceOld}>R$ {minCalc.originalPrice.toFixed(2)}</span>
          <div className={styles.priceNewRow}>
            <span className={styles.priceNew}>R$ {minCalc.finalPrice.toFixed(2)}</span>
            <span className={styles.discBadge}>{minCalc.discount}% OFF</span>
          </div>
        </div>
      </div>
    ) : (
      <div className={styles.price}>
        <span className={styles.pricePrefix}>A partir de</span>
        <span className={styles.priceNew}>R$ {group.minPrice.toFixed(2)}</span>
      </div>
    );
  }

  const v = group.variations[0];
  return firstCalc.hasDiscount ? (
    <div className={styles.price}>
      <div className={styles.discountWrap}>
        <span className={styles.priceOld}>R$ {firstCalc.originalPrice.toFixed(2)}</span>
        <div className={styles.priceNewRow}>
          <span className={styles.priceNew}>R$ {firstCalc.finalPrice.toFixed(2)}</span>
          <span className={styles.discBadge}>{firstCalc.discount}% OFF</span>
        </div>
      </div>
    </div>
  ) : (
    <div className={styles.price}>
      <span className={styles.priceNew}>R$ {parseFloat(v.valor).toFixed(2)}</span>
    </div>
  );
}

export default function ProductCard({ group, onOpenVariations }) {
  const router          = useRouter();
  const { add }         = useCart();
  const { showToast }   = useToast();
  const multi           = group.variations.length > 1;
  const first           = group.variations[0];
  const images          = parseImages(first.imagem);
  const slug            = groupSlug(group);

  const goToProduct = () => router.push(`/produto/${slug}`);

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (multi) {
      // Multi-variation: open picker modal
      onOpenVariations?.(group);
      return;
    }
    const result = add(first);
    if (result !== false) {
      showToast('Produto adicionado ao carrinho!', 'success');
    } else {
      showToast('Estoque insuficiente', 'error');
    }
  };

  return (
    <article className={styles.card} onClick={goToProduct} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && goToProduct()}>

      <div className={styles.imgWrap}>
        {(multi || group.totalStock <= 5) && (
          <div className={styles.badges}>
            {multi && <span className={`${styles.badge} ${styles.badgeOpts}`}>{group.variations.length} opções</span>}
            {group.totalStock <= 5 && <span className={`${styles.badge} ${styles.badgeLast}`}>Últimas unidades</span>}
          </div>
        )}
        <ProductImageCarousel images={images} alt={group.descricao} showThumbs={false} />
      </div>

      <div className={styles.body}>
        <div className={styles.name}>{group.descricao}</div>
        {(group.linha || group.litros) && (
          <div className={styles.details}>
            {group.linha  && <span>{group.linha}</span>}
            {group.litros && <span>{group.litros}</span>}
          </div>
        )}
        <PriceDisplay group={group} multi={multi} />
        <div className={styles.stock}>{group.totalStock} em estoque</div>

        {/* Dois botões — stopPropagation para não acionar o onClick do card */}
        <div className={styles.actions} onClick={e => e.stopPropagation()}>
          <button className={styles.btnCart} onClick={handleAddToCart}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            {multi ? 'Escolher' : 'Carrinho'}
          </button>
          <button className={styles.btnView} onClick={e => { e.stopPropagation(); goToProduct(); }}>
            Ver Produto
          </button>
        </div>
      </div>
    </article>
  );
}