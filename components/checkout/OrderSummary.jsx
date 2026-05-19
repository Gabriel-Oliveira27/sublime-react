'use client';
import { useState } from 'react';
import { validateCoupon } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { GiftIcon, TagIcon } from '@/components/icons/Icons';
import styles from './OrderSummary.module.css';

export default function OrderSummary({ cart, subtotal, shipping, discount, total, paymentMethod, installments, installmentFee, onCouponApplied }) {
  const [couponCode, setCouponCode] = useState('');
  const [couponMsg,  setCouponMsg]  = useState(null);
  const [applying,   setApplying]   = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const { showToast } = useToast();

  const shippingText = () => {
    if (shipping === 0 && subtotal > 0)   return 'Grátis';
    if (shipping === 'pending')            return 'A definir';
    if (typeof shipping === 'number')      return `R$ ${shipping.toFixed(2)}`;
    return 'Calcular';
  };

  const finalTotal = () => {
    if (paymentMethod === 'Credito' && installmentFee > 0) return total * (1 + installmentFee);
    return total;
  };

  const handleCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) { showToast('Digite um código de cupom', 'error'); return; }

    setApplying(true);
    setCouponMsg(null);
    try {
      const data = await validateCoupon(code);

      /* Support multiple possible field names from the API */
      const rawDesc = String(
        data?.desc ?? data?.desconto ?? data?.discount ?? data?.value ?? data?.type ?? ''
      ).trim().toLowerCase();

      let coupon = { code, valid: true, type: null, value: 0, discount: 0 };
      let label  = 'aplicado';

      if (rawDesc.includes('frete')) {
        coupon.type = 'fretegratis';
        label = 'frete grátis';
      } else {
        /* Try to extract a percentage number */
        const m = rawDesc.replace('%','').replace(',','.').match(/\d+(\.\d+)?/);
        if (m) {
          const pct = parseFloat(m[0]);
          if (!isNaN(pct) && pct > 0) {
            coupon.type  = 'percent';
            coupon.value = pct;
            label = `${pct}% de desconto`;
          }
        }
      }

      setCouponApplied(true);
      setCouponMsg({ ok: true, text: `Cupom aplicado: ${label}` });
      onCouponApplied(coupon);
      showToast('Cupom aplicado!', 'success');
    } catch (err) {
      setCouponApplied(false);
      const msg = err?.message || 'Cupom inválido ou expirado';
      setCouponMsg({ ok: false, text: msg });
      showToast(msg, 'error');
      /* Reset coupon in parent to avoid stale state */
      onCouponApplied({ code: null, valid: false, type: null, value: 0, discount: 0 });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className={styles.summary}>
      <h2>Resumo do Pedido</h2>

      <div className={styles.items}>
        {cart.map(item => (
          <div key={item.id} className={styles.item}>
            <div className={styles.itemInfo}>
              <h4>{item.descricao}</h4>
              <p>{item.cores || 'Padrão'} — Qtd: {item.quantity}</p>
            </div>
            <span className={styles.itemPrice}>R$ {(parseFloat(item.valor) * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className={styles.coupon}>
        <div className={styles.couponLabel}>
          <GiftIcon size={16}/>
          <span>Cupom de desconto</span>
        </div>
        <div className={styles.couponRow}>
          <input
            type="text"
            className="form-input"
            placeholder="Código do cupom"
            value={couponCode}
            onChange={e => setCouponCode(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') handleCoupon(); }}
            disabled={couponApplied}
            style={{ textTransform:'uppercase' }}
          />
          {couponApplied ? (
            <button className={styles.couponBtnRemove} onClick={() => {
              setCouponApplied(false);
              setCouponCode('');
              setCouponMsg(null);
              onCouponApplied({ code: null, valid: false, type: null, value: 0, discount: 0 });
            }}>Remover</button>
          ) : (
            <button className={styles.couponBtn} onClick={handleCoupon} disabled={applying}>
              {applying ? '…' : 'Aplicar'}
            </button>
          )}
        </div>
        {couponMsg && (
          <div className={`${styles.couponMsg} ${couponMsg.ok ? styles.couponOk : styles.couponErr}`}>
            <TagIcon size={14}/>
            <span>{couponMsg.text}</span>
          </div>
        )}
      </div>

      <div className={styles.totals}>
        <div className={styles.row}><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
        <div className={styles.row}><span>Frete</span><span>{shippingText()}</span></div>
        <div className={styles.row}><span>Desconto</span><span>{discount > 0 ? `-R$ ${discount.toFixed(2)}` : 'R$ 0,00'}</span></div>
        <div className={`${styles.row} ${styles.total}`}>
          <span><strong>Total</strong></span>
          <span><strong>R$ {finalTotal().toFixed(2)}</strong></span>
        </div>
      </div>
    </div>
  );
}
