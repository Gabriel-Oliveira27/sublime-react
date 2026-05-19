'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { CONFIG } from '@/lib/config';
import { WhatsAppIcon, CopyIcon } from '@/components/icons/Icons';
import styles from './page.module.css';

export default function WhatsAppPage() {
  const { items, isEmpty } = useCart();
  const { showToast }      = useToast();
  const router             = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    if (isEmpty) { alert('Seu carrinho está vazio!'); router.push('/'); }
  }, [isEmpty, router]);

  const buildMessage = () => {
    let msg   = 'Olá! Finalmente me decidi 😄\nQuero reservar os seguintes produtos:\n\n';
    let total = 0;
    items.forEach(item => {
      total += parseFloat(item.valor) * item.quantity;
      msg   += `• ${item.descricao}${item.cores ? ` (${item.cores})` : ''} – ${item.quantity}x\n`;
    });
    msg += `\nTotal estimado: R$ ${total.toFixed(2)}.\nComo posso te pagar?`;
    return msg;
  };

  const sendMobile  = () => { window.location.href = `https://wa.me/${CONFIG.API.WHATSAPP_NUMBER}?text=${encodeURIComponent(buildMessage())}`; };
  const sendWeb     = () => { window.open(`https://web.whatsapp.com/send?phone=${CONFIG.API.WHATSAPP_NUMBER}&text=${encodeURIComponent(buildMessage())}`, '_blank'); };
  const copyMessage = () => {
    const msg = buildMessage();
    navigator.clipboard.writeText(msg)
      .then(() => showToast('Mensagem copiada!', 'success'))
      .catch(() => {
        const ta = Object.assign(document.createElement('textarea'), { value: msg });
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        showToast('Mensagem copiada!', 'success');
      });
  };

  if (isEmpty) return null;
  const cartTotal = items.reduce((s, i) => s + parseFloat(i.valor) * i.quantity, 0);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <WhatsAppIcon size={50}/>
        </div>

        <h1>Nossa representante está disponível para te atender</h1>
        <p>Clique no botão abaixo para enviar sua mensagem com os produtos selecionados</p>

        <div className={styles.cartPreview}>
          <h3>Seus produtos selecionados</h3>
          {items.map(item => (
            <div key={item.id} className={styles.previewItem}>
              <span>{item.descricao}{item.cores ? ` (${item.cores})` : ''}</span>
              <span className={styles.previewQty}>×{item.quantity}</span>
            </div>
          ))}
          <div className={styles.previewTotal}>
            Total estimado: <strong>R$ {cartTotal.toFixed(2)}</strong>
          </div>
        </div>

        <div className={styles.buttons}>
          {isMobile ? (
            <button className={`${styles.btn} ${styles.btnGreen}`} onClick={sendMobile}>
              <WhatsAppIcon size={20}/> Enviar mensagem pelo WhatsApp
            </button>
          ) : (
            <>
              <button className={`${styles.btn} ${styles.btnGreen}`} onClick={sendWeb}>
                <WhatsAppIcon size={20}/> Enviar pelo WhatsApp Web
              </button>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={copyMessage}>
                <CopyIcon size={20}/> Copiar mensagem
              </button>
            </>
          )}
        </div>

        <a href="/" className={styles.backLink}>← Prefiro finalizar pelo site</a>
      </div>
    </div>
  );
}
