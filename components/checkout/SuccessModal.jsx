'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CONFIG } from '@/lib/config';
import { formatDateBR } from '@/lib/utils';
import { getPixStatus, simularPixPagamento } from '@/lib/api';
import CheckSuccessAnimation from '@/components/icons/CheckSuccessAnimation';
import { CopyIcon, WhatsAppIcon } from '@/components/icons/Icons';
import { useToast } from '@/context/ToastContext';
import styles from './SuccessModal.module.css';

export default function SuccessModal({ orderId, paymentMethod, deliveryType, pickupDate, pickupTime, pix, onClose }) {
  const router        = useRouter();
  const { showToast } = useToast();
  const [pixKey, setPixKey] = useState('');

  const isOnlinePix = !!pix;
  const [paid,       setPaid]       = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (!pix?.expiraEm) return 600;
    const s = Math.floor((new Date(pix.expiraEm).getTime() - Date.now()) / 1000);
    return Math.max(0, Math.min(600, s));
  });

  // Trava o scroll do body enquanto o modal está aberto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Fluxo manual: busca a chave PIX estática do banco
  useEffect(() => {
    if (isOnlinePix || paymentMethod !== 'PIX') return;
    fetch(`${CONFIG.API.VERCEL_URL}/api/config/pix`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.chave) setPixKey(data.chave); })
      .catch(() => {/* mantém fallback */});
  }, [paymentMethod, isOnlinePix]);

  // Fluxo online: contagem regressiva + polling da confirmação automática
  useEffect(() => {
    if (!isOnlinePix || paid) return;
    let alive = true;
    const poll = setInterval(async () => {
      const s = await getPixStatus(orderId);
      if (alive && s?.pago) { setPaid(true); showToast('Pagamento confirmado!', 'success'); }
    }, 3000);
    const tick = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => { alive = false; clearInterval(poll); clearInterval(tick); };
  }, [isOnlinePix, paid, orderId, showToast]);

  const isPickup = deliveryType === 'retirada';
  const dateStr  = pickupDate ? `${pickupTime} do dia ${formatDateBR(pickupDate)}` : '';
  const id       = <strong>{orderId}</strong>;
  const when     = <strong>{dateStr}</strong>;

  const renderMessage = () => {
    if (isPickup) {
      if (paymentMethod === 'Dinheiro') return <>Pedido {id} reservado!<br/>Aguardamos você às {when}.</>;
      if (paymentMethod === 'PIX')     return <>Pedido {id} reservado!<br/>Copie a chave PIX abaixo e envie o comprovante pelo WhatsApp. Retirada às {when}.</>;
      return <>Pedido {id} reservado!<br/>Aguarde o link de pagamento. Retirada às {when}.</>;
    }
    if (paymentMethod === 'Dinheiro') return <>Pedido {id} reservado!<br/>Prazo de entrega: até <strong>2 dias</strong>. Pagamento na entrega.</>;
    if (paymentMethod === 'PIX')     return <>Pedido {id} reservado!<br/>Envie o comprovante via WhatsApp. Após confirmação, entrega em até <strong>2 dias</strong>.</>;
    return <>Pedido {id} reservado!<br/>Aguarde o link de pagamento. Entrega em <strong>2 dias</strong> após aprovação.</>;
  };

  const copyText = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => showToast(label, 'success'))
      .catch(() => {
        const ta = Object.assign(document.createElement('textarea'), { value: text });
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        showToast(label, 'success');
      });
  };

  const doSimular = async () => {
    setSimulating(true);
    await simularPixPagamento(orderId);
    const s = await getPixStatus(orderId);
    if (s?.pago) { setPaid(true); showToast('Pagamento confirmado!', 'success'); }
    setSimulating(false);
  };

  const handleClose = () => {
    onClose?.();
    setTimeout(() => router.push('/'), 400);
  };

  const showWhatsApp = !isPickup && paymentMethod === 'Dinheiro';
  const waUrl        = `https://wa.me/${CONFIG.API.WHATSAPP_NUMBER}?text=${encodeURIComponent(`Olá! Pedido ${orderId}`)}`;
  const mm      = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss      = String(secondsLeft % 60).padStart(2, '0');
  const expired = isOnlinePix && !paid && secondsLeft <= 0;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} style={{ maxHeight: '92vh', overflowY: 'auto' }}>

        {isOnlinePix ? (
          paid ? (
            <>
              <div className={styles.animWrap}><CheckSuccessAnimation size={100}/></div>
              <div className={styles.message}>Pagamento confirmado! Pedido {id} pago com sucesso.</div>
              <div className={styles.actions}>
                <button className={styles.btnClose} onClick={handleClose}>Concluir</button>
              </div>
            </>
          ) : (
            <>
              <h2 style={{ textAlign: 'center', margin: '0 0 .25rem' }}>Pague com PIX</h2>
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '.9rem', margin: '0 0 1rem' }}>
                Pedido {id} — escaneie o QR ou copie o código
              </p>

              {expired ? (
                <div className={styles.message} style={{ color: 'var(--error)' }}>
                  O tempo para pagamento expirou. Refaça o pedido ou escolha pagar na retirada/entrega.
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pix.qrCodeDataUrl} alt="QR Code para pagamento PIX" width={220} height={220}
                      style={{ borderRadius: 12, border: '1px solid var(--border)' }}/>
                  </div>
                  <p style={{ textAlign: 'center', fontSize: '.85rem', color: 'var(--text-secondary)', margin: '.75rem 0 .25rem' }}>
                    Expira em <strong>{mm}:{ss}</strong>
                  </p>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, margin: '.5rem 0',
                    background: 'var(--surface-muted)', border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)', padding: '.6rem .75rem',
                  }}>
                    <code style={{ flex: 1, fontSize: '.72rem', wordBreak: 'break-all', color: 'var(--text-secondary)' }}>
                      {pix.copiaCola}
                    </code>
                  </div>
                  <div className={styles.actions}>
                    <button className={styles.btnPix} onClick={() => copyText(pix.copiaCola, 'Código PIX copiado!')}>
                      <CopyIcon size={18}/> Copiar código PIX
                    </button>
                    {pix.mock && (
                      <button className={styles.btnClose} onClick={doSimular} disabled={simulating}>
                        {simulating ? 'Simulando…' : 'Simular pagamento (teste)'}
                      </button>
                    )}
                    <button className={styles.btnClose} onClick={handleClose}>Pagar depois</button>
                  </div>
                  <p style={{ textAlign: 'center', fontSize: '.78rem', color: 'var(--text-muted)', marginTop: '.5rem' }}>
                    A confirmação é automática. Acompanhe em Minhas Compras.
                  </p>
                </>
              )}
            </>
          )
        ) : (
          <>
            <div className={styles.animWrap}><CheckSuccessAnimation size={100}/></div>

            <div className={styles.message}>{renderMessage()}</div>

            {paymentMethod === 'PIX' && (
              <div className={styles.pixKeyBox}>
                <span className={styles.pixKeyLabel}>Chave PIX </span>
                <span className={styles.pixKeyValue}>{pixKey}</span>
              </div>
            )}

            <div className={styles.actions}>
              {paymentMethod === 'PIX' && (
                <button className={styles.btnPix} onClick={() => copyText(pixKey, 'Chave PIX copiada!')}>
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
          </>
        )}

      </div>
    </div>
  );
}
