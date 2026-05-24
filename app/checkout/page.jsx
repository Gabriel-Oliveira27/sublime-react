'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import StepIndicator from '@/components/checkout/StepIndicator';
import OrderSummary from '@/components/checkout/OrderSummary';
import SuccessModal from '@/components/checkout/SuccessModal';
import {
  PixIcon, BanknoteIcon, CreditCardIcon, MapPinIcon, TruckIcon,
  AlertTriangleIcon, CheckCircleIcon, InfoIcon, PackageIcon, ClipboardListIcon,
} from '@/components/icons/Icons';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { CONFIG } from '@/lib/config';
import {
  validateCPF, applyPhoneMask, applyCPFMask, applyCEPMask,
  parseCurrency, formatDateBR, computeShippingCost, haversine,
} from '@/lib/utils';
import { lookupCEP, geocodeAddress, reserveOrder, consumeCoupon } from '@/lib/api';
import styles from './page.module.css';

const INITIAL_DELIVERY = {
  type: '', pickupWho: '', pickupDate: '', pickupTime: '',
  cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '',
  lat: null, lon: null, distanceKm: null, shippingCost: null, shippingNote: '',
};
const INITIAL_COUPON = { code: null, type: null, value: 0, discount: 0, valid: false };

export default function CheckoutPage() {
  const { items, isEmpty, clear } = useCart();
  const { showToast }             = useToast();
  const router                    = useRouter();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  /* KEY FIX: prevent the isEmpty→redirect from firing after order is placed */
  const orderPlacedRef = useRef(false);

  const [step,        setStep]        = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [loadTxt,     setLoadTxt]     = useState('Processando…');
  const [successData, setSuccessData] = useState(null);
  const [errors,      setErrors]      = useState({});

  const [customer,  setCustomer]  = useState({ name: '', phone: '', cpf: '' });
  const [delivery,  setDelivery]  = useState(INITIAL_DELIVERY);
  const [payment,   setPayment]   = useState({ method: '', installments: 1 });
  const [coupon,    setCoupon]    = useState(INITIAL_COUPON);
  const [changeFor, setChangeFor] = useState('');

  useEffect(() => {
    if (isEmpty && !orderPlacedRef.current) {
      showToast('Carrinho vazio. Adicione produtos antes de continuar.', 'error');
      router.push('/');
    }
  }, [isEmpty]);

  /* ── Totals ── */
  const subtotal = items.reduce((s, i) => s + parseFloat(i.valor) * i.quantity, 0);

  const discount = (() => {
    if (!coupon.valid) return 0;
    if (coupon.type === 'percent') return +(subtotal * (coupon.value / 100)).toFixed(2);
    return Number(coupon.discount || 0);
  })();

  const shipping = (() => {
    if (delivery.type === 'retirada')    return 0;
    if (coupon.type === 'fretegratis')   return 0;
    return delivery.shippingCost;
  })();

  const total          = +(subtotal - discount + (typeof shipping === 'number' ? shipping : 0)).toFixed(2);
  const installmentFee = payment.method === 'Credito' ? (CONFIG.INSTALLMENT_FEES[payment.installments] || 0) : 0;

  const goTo = (n) => { setStep(n); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  /* ── Validation ── */
  const validate = () => {
    const errs = {};
    if (step === 1) {
      if (!customer.name.trim())                          errs.name  = 'Digite seu nome completo';
      if (customer.phone.replace(/\D/g,'').length < 10)   errs.phone = 'Digite um telefone válido';
      if (customer.cpf && !validateCPF(customer.cpf))     errs.cpf   = 'CPF inválido';
    }
    if (step === 2) {
      if (!delivery.type) { showToast('Selecione como deseja receber', 'error'); return false; }
      if (delivery.type === 'retirada') {
        if (!delivery.pickupWho.trim())  errs.pickupWho  = 'Digite quem vai retirar';
        if (!delivery.pickupDate)        errs.pickupDate = 'Selecione a data';
        if (!delivery.pickupTime)        errs.pickupTime = 'Selecione o horário';
      } else {
        if (delivery.cep.replace(/\D/g,'').length !== 8) errs.cep = 'CEP inválido';
        if (!delivery.street || !delivery.number || !delivery.neighborhood || !delivery.city || !delivery.state) {
          showToast('Preencha todos os campos de endereço', 'error'); return false;
        }
      }
    }
    if (step === 4) {
      if (!payment.method) { showToast('Selecione uma forma de pagamento', 'error'); return false; }
      if (payment.method === 'Dinheiro') {
        const given = parseCurrency(changeFor);
        if (given > 0 && given < total - 0.001) {
          showToast('Valor de troco insuficiente', 'error'); return false;
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = async () => {
    if (!validate()) return;
    if (step === 2 && delivery.type === 'entrega' &&
        (delivery.shippingCost == null || delivery.shippingCost === 'pending')) {
      try { setLoading(true); setLoadTxt('Calculando frete…'); await doCalculateShipping(); }
      catch { showToast('Não foi possível calcular o frete agora.', 'warning'); }
      finally { setLoading(false); }
    }
    goTo(step + 1);
  };

  /* ── CEP ── */
  const doSearchCEP = async () => {
    setLoading(true); setLoadTxt('Buscando CEP…');
    try {
      const data = await lookupCEP(delivery.cep);
      setDelivery(d => ({
        ...d,
        street: data.logradouro || '', neighborhood: data.bairro || '',
        city: data.localidade || '', state: data.uf || '',
      }));
      showToast('CEP encontrado!', 'success');
      await doCalculateShipping({ city: data.localidade, state: data.uf, cep: delivery.cep.replace(/\D/g,'') });
    } catch (err) {
      showToast(err.message || 'CEP não encontrado', 'error');
    } finally { setLoading(false); }
  };

  /* ── Shipping ── */
  const doCalculateShipping = useCallback(async (overrides = {}) => {
    const city = overrides.city  || delivery.city;
    const stUF = overrides.state || delivery.state;
    const cep  = (overrides.cep  || delivery.cep).replace(/\D/g,'');
    if (!city || !stUF || !cep) { showToast('Informe CEP, cidade e estado', 'error'); return; }

    setLoading(true); setLoadTxt('Calculando frete…');
    try {
      if (!CONFIG.ORIGIN.lat) {
        const c = await geocodeAddress(`${CONFIG.ORIGIN.STREET}, ${CONFIG.ORIGIN.CITY}, ${CONFIG.ORIGIN.STATE}`);
        if (c) { CONFIG.ORIGIN.lat = c.lat; CONFIG.ORIGIN.lon = c.lon; }
      }
      let destCoords = null;
      if (delivery.street && delivery.number) {
        destCoords = await geocodeAddress(`${delivery.street} ${delivery.number}, ${city} ${stUF}, ${cep}`);
      }
      if (!destCoords) destCoords = await geocodeAddress(`${city}, ${stUF}, ${cep}`);

      const distKm = (destCoords && CONFIG.ORIGIN.lat)
        ? haversine(CONFIG.ORIGIN.lat, CONFIG.ORIGIN.lon, destCoords.lat, destCoords.lon)
        : (city.toLowerCase() === CONFIG.ORIGIN.CITY.toLowerCase() ? 5 : 15);

      const result = computeShippingCost(subtotal, distKm, city);
      setDelivery(d => ({ ...d, distanceKm: distKm, shippingCost: result.cost, shippingNote: result.note || '' }));
      showToast('Frete calculado!', 'success');
    } catch {
      showToast('Erro ao calcular frete.', 'error');
    } finally { setLoading(false); }
  }, [delivery, subtotal]);

  /* ── Submit ── */
  const finishOrder = async () => {
    if (!validate()) return;
    setLoading(true); setLoadTxt('Reservando seus produtos…');
    try {
      const itemsPayload = items.map(i => ({
        id: i.id, descricao: i.descricao, cores: i.cores || 'Padrão', qty: i.quantity,
      }));

      let deliveryPayload = { type: delivery.type };
      if (delivery.type === 'retirada') {
        Object.assign(deliveryPayload, {
          address:      `Retirada — ${delivery.pickupWho} | ${formatDateBR(delivery.pickupDate)} às ${delivery.pickupTime}`,
          cep:          CONFIG.ORIGIN.CEP,
          retiradaWho:  delivery.pickupWho,
          retiradaDate: delivery.pickupDate,
          retiradaTime: delivery.pickupTime,
          frete: 0, distanceKm: 0,
        });
      } else {
        Object.assign(deliveryPayload, {
          address:    `${delivery.street}, ${delivery.number}${delivery.complement ? ' – ' + delivery.complement : ''}, ${delivery.neighborhood}, ${delivery.city}/${delivery.state}`,
          cep:        delivery.cep,
          frete:      typeof delivery.shippingCost === 'number' ? delivery.shippingCost : 0,
          distanceKm: delivery.distanceKm,
        });
      }

      const instFee  = (payment.method === 'Credito' && payment.installments > 1)
        ? CONFIG.INSTALLMENT_FEES[payment.installments] || 0 : 0;
      const finalTotal = +(total * (1 + instFee)).toFixed(2);

      const result = await reserveOrder({
        customer,
        items: itemsPayload,
        delivery: deliveryPayload,
        payment: {
          method:       payment.method,
          installments: Number(payment.installments),
          changeFor:    payment.method === 'Dinheiro' ? parseCurrency(changeFor) : '',
        },
        coupon:   coupon.code || '',
        subtotal: +subtotal.toFixed(2),
        total:    finalTotal,
      });

      if (result.success) {
        /* Non-critical — wrapped so it never blocks the success screen */
        try { if (coupon.code) await consumeCoupon(coupon.code); } catch { /* ignore */ }

        /* CRITICAL: set guard BEFORE clear() so isEmpty effect doesn't redirect */
        orderPlacedRef.current = true;
        clear();
        setSuccessData({ orderId: result.orderId || result.orderCode || 'N/A' });
      } else {
        throw new Error(result.error || result.message || 'Erro ao processar pedido');
      }
    } catch (err) {
      showToast(err.message || 'Erro ao processar pedido', 'error');
    } finally {
      setLoading(false);
    }
  };

  const installmentOptions = Array.from({ length: CONFIG.STORE.MAX_INSTALLMENTS }, (_, i) => {
    const n = i + 1, fee = CONFIG.INSTALLMENT_FEES[n] || 0, tot = total * (1 + fee);
    return { n, label: total > 0 ? `${n}x de R$ ${(tot/n).toFixed(2)} (Total R$ ${tot.toFixed(2)})` : `${n}x de R$ 0,00` };
  });

  const E = (key) => errors[key] ? <span className="error-message">{errors[key]}</span> : null;

  const STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  const TIMES  = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00'];

  return (
    <>
      <Header
        backLabel="← Voltar para a loja"
        showSearch={false}
        showCart={false}
        onBackClick={() => setShowExitConfirm(true)}
      />

      {/* ── Modal confirmação de saída ───────────────────────────── */}
      {showExitConfirm && (
        <div style={{
          position:'fixed',inset:0,zIndex:9999,
          background:'rgba(26,18,24,.55)',backdropFilter:'blur(4px)',
          display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'
        }}>
          <div style={{
            background:'var(--surface)',borderRadius:'var(--r-xl)',
            padding:'2rem',maxWidth:'360px',width:'100%',
            boxShadow:'0 20px 60px rgba(26,18,24,.25)',
            border:'1px solid var(--border)',textAlign:'center'
          }}>
            <div style={{fontSize:'2.5rem',marginBottom:'1rem'}}>🛒</div>
            <h3 style={{marginBottom:'.5rem',color:'var(--text-primary)'}}>Sair do checkout?</h3>
            <p style={{color:'var(--text-secondary)',fontSize:'.9rem',marginBottom:'1.5rem',lineHeight:1.5}}>
              Seu carrinho será mantido, mas o progresso desta etapa será perdido.
            </p>
            <div style={{display:'flex',gap:'.75rem',justifyContent:'center'}}>
              <button
                onClick={() => setShowExitConfirm(false)}
                style={{
                  padding:'.6rem 1.25rem',borderRadius:'var(--r-md)',
                  border:'1.5px solid var(--border)',background:'var(--surface-muted)',
                  color:'var(--text-primary)',fontWeight:600,cursor:'pointer',fontSize:'.9rem'
                }}>
                Continuar comprando
              </button>
              <button
                onClick={() => router.push('/')}
                style={{
                  padding:'.6rem 1.25rem',borderRadius:'var(--r-md)',
                  border:'none',background:'var(--accent)',
                  color:'white',fontWeight:600,cursor:'pointer',fontSize:'.9rem'
                }}>
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
      <StepIndicator currentStep={step} />

      <main className={styles.main}>
        <div className={styles.grid}>

          <div className={styles.form}>

            {/* ─── STEP 1 ─── */}
            {step === 1 && (
              <div>
                <h2 className={styles.stepTitle}>Seus Dados</h2>
                <div className="form-group">
                  <label>Nome Completo *</label>
                  <input className="form-input" value={customer.name} autoComplete="name"
                    onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))}/>
                  {E('name')}
                </div>
                <div className="form-group">
                  <label>Telefone / WhatsApp *</label>
                  <input className="form-input" placeholder="(00) 00000-0000" inputMode="tel"
                    value={customer.phone}
                    onChange={e => setCustomer(c => ({ ...c, phone: applyPhoneMask(e.target.value) }))}/>
                  {E('phone')}
                </div>
                <div className="form-group">
                  <label>CPF <span className={styles.labelNote}>(opcional — necessário para rastrear pedidos)</span></label>
                  <input className="form-input" placeholder="000.000.000-00" inputMode="numeric"
                    value={customer.cpf}
                    onChange={e => setCustomer(c => ({ ...c, cpf: applyCPFMask(e.target.value) }))}/>
                  {E('cpf')}
                  <small className={styles.hint}>Se informado, use para consultar seus pedidos em Minhas Compras.</small>
                </div>
                <div className={styles.actions}>
                  <button className="btn btn-primary" onClick={nextStep}>Avançar →</button>
                </div>
              </div>
            )}

            {/* ─── STEP 2 ─── */}
            {step === 2 && (
              <div>
                <h2 className={styles.stepTitle}>Como deseja receber?</h2>
                <div className={styles.deliveryOpts}>
                  {[
                    { key: 'retirada', Icon: MapPinIcon, title: 'Retirada', sub: 'Buscar no local — grátis' },
                    { key: 'entrega',  Icon: TruckIcon,  title: 'Entrega',  sub: 'Receber em casa' },
                  ].map(({ key, Icon, title, sub }) => (
                    <div key={key}
                      className={`${styles.delivOpt} ${delivery.type === key ? styles.selected : ''}`}
                      onClick={() => setDelivery(d => ({ ...d, type: key, shippingCost: key === 'retirada' ? 0 : d.shippingCost }))}
                    >
                      <Icon size={28} className={styles.delivOptIcon}/>
                      <h3>{title}</h3>
                      <p>{sub}</p>
                    </div>
                  ))}
                </div>

                {delivery.type === 'retirada' && (
                  <>
                    <div className="info-box"><strong>Endereço de Retirada</strong><br/>{CONFIG.ORIGIN.DISPLAY}</div>
                    <div className="form-group">
                      <label>Quem vai retirar? *</label>
                      <input className="form-input" placeholder="Nome completo" value={delivery.pickupWho}
                        onChange={e => setDelivery(d => ({ ...d, pickupWho: e.target.value }))}/>
                      {E('pickupWho')}
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Data *</label>
                        <input type="date" className="form-input" value={delivery.pickupDate}
                          onChange={e => setDelivery(d => ({ ...d, pickupDate: e.target.value }))}/>
                        {E('pickupDate')}
                      </div>
                      <div className="form-group">
                        <label>Horário *</label>
                        <select className="form-select" value={delivery.pickupTime}
                          onChange={e => setDelivery(d => ({ ...d, pickupTime: e.target.value }))}>
                          <option value="">Selecione</option>
                          {TIMES.map(t => <option key={t}>{t}</option>)}
                        </select>
                        {E('pickupTime')}
                      </div>
                    </div>
                    <div className={styles.warningBox}>
                      <AlertTriangleIcon size={16}/>
                      <span>Se não houver atendente disponível no horário, entre em contato para remarcar.</span>
                    </div>
                  </>
                )}

                {delivery.type === 'entrega' && (
                  <>
                    <div className="info-box"><strong>Origem:</strong> {CONFIG.ORIGIN.STREET} — CEP {CONFIG.ORIGIN.CEP}</div>
                    <div className="form-group">
                      <label>CEP *</label>
                      <div style={{ display:'flex', gap:'.75rem' }}>
                        <input className="form-input" placeholder="00000-000" inputMode="numeric"
                          value={delivery.cep}
                          onChange={e => setDelivery(d => ({ ...d, cep: applyCEPMask(e.target.value) }))}/>
                        <button className={styles.inlineBtn} onClick={doSearchCEP}>Buscar CEP</button>
                      </div>
                      {E('cep')}
                    </div>
                    <div className="form-group">
                      <label>Rua *</label>
                      <input className="form-input" value={delivery.street}
                        onChange={e => setDelivery(d => ({ ...d, street: e.target.value }))}/>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Número *</label>
                        <input className="form-input" value={delivery.number}
                          onChange={e => setDelivery(d => ({ ...d, number: e.target.value }))}/>
                      </div>
                      <div className="form-group">
                        <label>Complemento</label>
                        <input className="form-input" value={delivery.complement}
                          onChange={e => setDelivery(d => ({ ...d, complement: e.target.value }))}/>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Bairro *</label>
                      <input className="form-input" value={delivery.neighborhood}
                        onChange={e => setDelivery(d => ({ ...d, neighborhood: e.target.value }))}/>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Cidade *</label>
                        <input className="form-input" value={delivery.city}
                          onChange={e => setDelivery(d => ({ ...d, city: e.target.value }))}/>
                      </div>
                      <div className="form-group">
                        <label>Estado *</label>
                        <select className="form-select" value={delivery.state}
                          onChange={e => setDelivery(d => ({ ...d, state: e.target.value }))}>
                          <option value="">Selecione</option>
                          {STATES.map(uf => <option key={uf}>{uf}</option>)}
                        </select>
                      </div>
                    </div>
                    <button className={styles.calcFreteBtn} onClick={() => doCalculateShipping()}>
                      Calcular frete
                    </button>
                    {delivery.shippingCost !== null && typeof delivery.shippingCost === 'number' && (
                      <div className={styles.shippingResult}>
                        <CheckCircleIcon size={18}/>
                        <span>Frete calculado: <strong>
                          {delivery.shippingCost === 0 ? 'Grátis' : `R$ ${delivery.shippingCost.toFixed(2)}`}
                        </strong></span>
                        {delivery.shippingNote && <p className={styles.shippingNote}>{delivery.shippingNote}</p>}
                      </div>
                    )}
                    {delivery.shippingCost === 'pending' && (
                      <div className={styles.warningBox} style={{ marginTop:'1rem' }}>
                        <AlertTriangleIcon size={16}/>
                        <span>{delivery.shippingNote || 'Envio será combinado com o vendedor.'}</span>
                      </div>
                    )}
                  </>
                )}

                <div className={styles.actions}>
                  <button className="btn btn-secondary" onClick={() => goTo(1)}>← Voltar</button>
                  <button className="btn btn-primary"   onClick={nextStep}>Avançar →</button>
                </div>
              </div>
            )}

            {/* ─── STEP 3 ─── */}
            {step === 3 && (
              <div>
                <h2 className={styles.stepTitle}>Conferir Pedido</h2>

                <div className={styles.reviewSection}>
                  <h3><PackageIcon size={18}/> Produtos</h3>
                  {items.map(item => (
                    <div key={item.id} className={styles.reviewItem}>
                      <span>{item.quantity}x {item.descricao} ({item.cores || 'Padrão'})</span>
                      <span>R$ {(parseFloat(item.valor) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.reviewSection}>
                  <h3><TruckIcon size={18}/> Recebimento</h3>
                  {delivery.type === 'retirada' ? (
                    <>
                      <p><strong>Tipo:</strong> Retirada no local</p>
                      <p><strong>Quem:</strong> {delivery.pickupWho}</p>
                      <p><strong>Data:</strong> {formatDateBR(delivery.pickupDate)} às {delivery.pickupTime}</p>
                      <p className={styles.reviewMuted}>{CONFIG.ORIGIN.DISPLAY}</p>
                    </>
                  ) : (
                    <>
                      <p><strong>Tipo:</strong> Entrega</p>
                      <p><strong>Endereço:</strong> {delivery.street}, {delivery.number}{delivery.complement ? ` – ${delivery.complement}` : ''}</p>
                      <p>{delivery.neighborhood}, {delivery.city}/{delivery.state} — CEP {delivery.cep}</p>
                      <p><strong>Frete:</strong> {typeof delivery.shippingCost === 'number'
                        ? (delivery.shippingCost === 0 ? 'Grátis' : `R$ ${delivery.shippingCost.toFixed(2)}`) : '—'}</p>
                    </>
                  )}
                </div>

                <div className={styles.reviewSection}>
                  <h3><ClipboardListIcon size={18}/> Valores</h3>
                  <div className={styles.reviewRow}><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
                  <div className={styles.reviewRow}>
                    <span>Frete</span>
                    <span>{typeof shipping === 'number' ? (shipping === 0 ? 'Grátis' : `R$ ${shipping.toFixed(2)}`) : '—'}</span>
                  </div>
                  <div className={styles.reviewRow}><span>Desconto</span><span>{discount > 0 ? `-R$ ${discount.toFixed(2)}` : 'R$ 0,00'}</span></div>
                  <div className={`${styles.reviewRow} ${styles.totalRow}`}>
                    <span><strong>Total</strong></span>
                    <span><strong>R$ {total.toFixed(2)}</strong></span>
                  </div>
                </div>

                <div className={styles.actions}>
                  <button className="btn btn-secondary" onClick={() => goTo(2)}>← Voltar</button>
                  <button className="btn btn-primary"   onClick={() => goTo(4)}>Ir para Pagamento →</button>
                </div>
              </div>
            )}

            {/* ─── STEP 4 ─── */}
            {step === 4 && (
              <div>
                <h2 className={styles.stepTitle}>Forma de Pagamento</h2>

                <div className={styles.payMethods}>
                  {[
                    { key:'PIX',      Icon: PixIcon,        title:'PIX',              sub:'Aprovação imediata' },
                    { key:'Dinheiro', Icon: BanknoteIcon,   title:'Dinheiro',         sub:'Pagar na entrega/retirada' },
                    { key:'Credito',  Icon: CreditCardIcon, title:'Cartão de Crédito',sub:'Parcelamento disponível' },
                  ].map(({ key, Icon, title, sub }) => (
                    <div key={key}
                      className={`${styles.payMethod} ${payment.method === key ? styles.selected : ''}`}
                      onClick={() => setPayment(p => ({ ...p, method: key }))}
                    >
                      <div className={styles.payIcon}><Icon size={key === 'PIX' ? 36 : 28}/></div>
                      <h3>{title}</h3>
                      <p>{sub}</p>
                    </div>
                  ))}
                </div>

                {payment.method === 'PIX' && (
                  <div className={styles.infoBox}>
                    <InfoIcon size={18}/>
                    <span>Após confirmar, você recebe as instruções para pagamento via PIX.</span>
                  </div>
                )}

                {payment.method === 'Dinheiro' && (
                  <>
                    <div className={styles.infoBox}>
                      <InfoIcon size={18}/>
                      <span>Pagamento na entrega ou retirada.</span>
                    </div>
                    <div className="form-group" style={{ marginTop:'1rem' }}>
                      <label>Troco para quanto? <span className={styles.labelNote}>(opcional)</span></label>
                      <input className="form-input" type="number" min="0" placeholder="Ex: 100"
                        value={changeFor} onChange={e => setChangeFor(e.target.value.replace(/\D/g,''))}/>
                    </div>
                  </>
                )}

                {payment.method === 'Credito' && (
                  <>
                    <div className="form-group" style={{ marginTop:'1rem' }}>
                      <label>Número de Parcelas</label>
                      <select className="form-select" value={payment.installments}
                        onChange={e => setPayment(p => ({ ...p, installments: parseInt(e.target.value) }))}>
                        {installmentOptions.map(o => <option key={o.n} value={o.n}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className={styles.installSummary}>
                      <div className={styles.installRow}><span>Valor sem juros</span><span>R$ {total.toFixed(2)}</span></div>
                      <div className={`${styles.installRow} ${styles.installHL}`}>
                        <span><strong>Total com juros</strong></span>
                        <span><strong>R$ {(total * (1 + installmentFee)).toFixed(2)}</strong></span>
                      </div>
                    </div>
                  </>
                )}

                <div className={styles.actions}>
                  <button className="btn btn-secondary" onClick={() => goTo(3)}>← Voltar</button>
                  <button className={`btn btn-primary ${styles.finishBtn}`} onClick={finishOrder} disabled={loading}>
                    {loading
                      ? <><span className="spinner spinner-sm" style={{ borderTopColor:'white', borderColor:'rgba(255,255,255,.3)' }}/>&nbsp;Processando…</>
                      : 'Reservar Pedido'}
                  </button>
                </div>
              </div>
            )}

          </div>{/* /.form */}

          <OrderSummary
            cart={items}
            subtotal={subtotal}
            shipping={shipping}
            discount={discount}
            total={total}
            paymentMethod={payment.method}
            installments={payment.installments}
            installmentFee={installmentFee}
            onCouponApplied={(c) => {
              setCoupon(c);
              if (c.type === 'fretegratis') setDelivery(d => ({ ...d, shippingCost: 0 }));
            }}
          />

        </div>
      </main>

      <Footer />

      {loading && (
        <div className={styles.loadingOverlay}>
          <div className="spinner" style={{ borderTopColor:'white', borderColor:'rgba(255,255,255,.3)' }}/>
          <p>{loadTxt}</p>
        </div>
      )}

      {successData && (
        <SuccessModal
          orderId={successData.orderId}
          paymentMethod={payment.method}
          deliveryType={delivery.type}
          pickupDate={delivery.pickupDate}
          pickupTime={delivery.pickupTime}
          onClose={() => setSuccessData(null)}
        />
      )}
    </>
  );
}