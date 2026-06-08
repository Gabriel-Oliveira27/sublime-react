'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CONFIG } from '@/lib/config';
import { formatDateBR } from '@/lib/utils';
import CheckSuccessAnimation from '@/components/icons/CheckSuccessAnimation';
import { CopyIcon, WhatsAppIcon } from '@/components/icons/Icons';
import { useToast } from '@/context/ToastContext';
import styles from './SuccessModal.module.css';

export default function SuccessModal({ orderId, paymentMethod, deliveryType, pickupDate, pickupTime, onClose }) {
  const router        = useRouter();
  const { showToast } = useToast();
  const [pixKey, setPixKey] = useState(''); // carregado da API abaixo

  // Busca a chave PIX atualizada do banco ao abrir o modal
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    if (paymentMethod === 'PIX') {
      fetch(`${CONFIG.API.VERCEL_URL}/api/config/pix`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.chave) setPixKey(data.chave); })
        .catch(() => {/* mantém fallback */});
    }
    return () => { document.body.style.overflow = ''; };
  }, [paymentMethod]);

  const isPickup = deliveryType === 'retirada';
  const dateStr  = pickupDate ? `${pickupTime} do dia ${formatDateBR(pickupDate)}` : '';

  const getMessage = () => {
    if (isPickup) {
      if (paymentMethod === 'Dinheiro') return `Pedido <strong>${orderId}</strong> reservado!<br/>Aguardamos você às <strong>${dateStr}</strong>.`;
      if (paymentMethod === 'PIX')     return `Pedido <strong>${orderId}</strong> reservado!<br/>Copie a chave PIX abaixo e envie o comprovante pelo WhatsApp. Retirada às <strong>${dateStr}</strong>.`;
      return `Pedido <strong>${orderId}</strong> reservado!<br/>Aguarde o link de pagamento. Retirada às <strong>${dateStr}</strong>.`;
    }
    if (paymentMethod === 'Dinheiro') return `Pedido <strong>${orderId}</strong> reservado!<br/>Prazo de entrega: até <strong>2 dias</strong>. Pagamento na entrega.`;
    if (paymentMethod === 'PIX')     return `Pedido <strong>${orderId}</strong> reservado!<br/>Envie o comprovante via WhatsApp. Após confirmação, entrega em até <strong>2 dias</strong>.`;
    return `Pedido <strong>${orderId}</strong> reservado!<br/>Aguarde o link de pagamento. Entrega em <strong>2 dias</strong> após aprovação.`;
  };

  const showPIX      = paymentMethod === 'PIX';
  const showWhatsApp = !isPickup && paymentMethod === 'Dinheiro';
  const waUrl        = `https://wa.me/${CONFIG.API.WHATSAPP_NUMBER}?text=${encodeURIComponent(`Olá! Pedido ${orderId}`)}`;

  const copyPix = () => {
    navigator.clipboard.writeText(pixKey)
      .then(() => showToast('Chave PIX copiada!', 'success'))
      .catch(() => {
        const ta = Object.assign(document.createElement('textarea'), { value: pixKey });
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        showToast('Chave PIX copiada!', 'success');
      });
  };

  const handleClose = () => {
    onClose?.();
    setTimeout(() => router.push('/'), 400);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.animWrap}>
          <CheckSuccessAnimation size={100}/>
        </div>

        <div className={styles.message} dangerouslySetInnerHTML={{ __html: getMessage() }}/>

        {showPIX && (
          <div className={styles.pixKeyBox}>
            <span className={styles.pixKeyLabel}>Chave PIX </span>
            <span className={styles.pixKeyValue}>{pixKey}</span>
          </div>
        )}

        <div className={styles.actions}>
          {showPIX && (
            <button className={styles.btnPix} onClick={copyPix}>
              <CopyIcon size={18}/> Copiar chave PIX
            </button>
          )}
          {showWhatsApp && (
            <a href={waUrl} target="_blank" rel="noreferrer" className={styles.btnWa}>
              <WhatsAppIcon size={18}/> Falar com vendedor
            </a>
          )}
          <button className={styles.btnClose} onClick={handleClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}