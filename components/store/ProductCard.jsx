// components/store/ProductCard.jsx
'use client';
import { applyDiscount, parseImages } from '@/lib/utils';
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

export default function ProductCard({ group, onOpenVariations, onOpenDetail }) {
  const multi  = group.variations.length > 1;
  const first  = group.variations[0];
  const images = parseImages(first.imagem);

  return (
    <article className={styles.card}>
      <div className={styles.imgWrap}>
        {(multi || group.totalStock <= 5) && (
          <div className={styles.badges}>
            {multi && <span className={`${styles.badge} ${styles.badgeOpts}`}>{group.variations.length} opções</span>}
            {group.totalStock <= 5 && <span className={`${styles.badge} ${styles.badgeLast}`}>Últimas unidades</span>}
          </div>
        )}
        <ProductImageCarousel images={images} alt={group.descricao} />
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
        <button
          className={styles.btn}
          onClick={() => multi ? onOpenVariations(group) : onOpenDetail(group)}
        >
          {multi ? 'Ver Opções' : 'Ver Produto'}
        </button>
      </div>
    </article>
  );
}
