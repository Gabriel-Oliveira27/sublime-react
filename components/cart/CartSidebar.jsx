'use client';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { productImagePath, PLACEHOLDER_IMG_SMALL } from '@/lib/utils';
import styles from './CartSidebar.module.css';
import { useConfig } from '@/context/ConfigContext';

export default function CartSidebar() {
  const { items, sidebarOpen, totalPrice, isEmpty, remove, updateQty, toggleSidebar, closeSidebar } = useCart();
  const { whatsappAtivo } = useConfig();
  const { showToast } = useToast();
  const router = useRouter();

  const goToCheckout = () => {
    if (isEmpty) { showToast('Seu carrinho está vazio', 'error'); return; }
    closeSidebar();
    router.push('/checkout');
  };

  const goToWhatsApp = () => {
    if (isEmpty) { showToast('Seu carrinho está vazio', 'error'); return; }
    closeSidebar();
    router.push('/whatsapp');
  };

  return (
    <>
      <div className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`} aria-label="Carrinho">
        <div className={styles.header}>
          <h2>Meu Carrinho</h2>
          <button className={styles.closeBtn} onClick={toggleSidebar} aria-label="Fechar">×</button>
        </div>

        <div className={styles.items}>
          {isEmpty ? (
            <div className={styles.empty}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity:.5}}>
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              <p>Seu carrinho está vazio</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className={styles.item}>
                <img
                  src={productImagePath(item.imagem)}
                  alt={item.descricao}
                  className={styles.itemImg}
                  onError={e => { e.target.onerror = null; e.target.src = PLACEHOLDER_IMG_SMALL; }}
                />
                <div className={styles.itemDetails}>
                  <div className={styles.itemName}>{item.descricao}</div>
                  {item.cores && <div className={styles.itemColor}>{item.cores}</div>}
                  <div className={styles.itemPrice}>
                    R$ {(parseFloat(item.valor) * item.quantity).toFixed(2)}
                  </div>
                  <div className={styles.itemQty}>
                    <button className={styles.qtyBtn} onClick={() => updateQty(item.id, -1)}>−</button>
                    <span>{item.quantity}</span>
                    <button className={styles.qtyBtn} onClick={() => updateQty(item.id, 1)}>+</button>
                  </div>
                  <button className={styles.removeBtn} onClick={() => { remove(item.id); showToast('Produto removido', 'success'); }}>
                    Remover
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.total}>
            <span>Total</span>
            <span className={styles.totalValue}>R$ {totalPrice.toFixed(2)}</span>
          </div>
          <button className={`${styles.checkoutBtn} ${styles.primary}`} onClick={goToCheckout} disabled={isEmpty}>
            Finalizar pedido
          </button>
          {whatsappAtivo && (
          <button className={`${styles.checkoutBtn} ${styles.whatsapp}`} onClick={goToWhatsApp} disabled={isEmpty}>
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Pedir pelo WhatsApp
          </button>
          )}
          <p className={styles.helper}>Pedido pelo WhatsApp sujeito a fila de atendimento</p>
        </div>
      </div>
    </>
  );
}