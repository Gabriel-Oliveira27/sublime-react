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
import { useConfig } from '@/context/ConfigContext';
import LocationMapModal from '@/components/store/LocationMapModal';
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
  referencia: '',
  lat: null, lon: null, distanceKm: null, shippingCost: null, shippingNote: '',
};
const INITIAL_COUPON = { code: null, type: null, value: 0, discount: 0, valid: false };

export default function CheckoutPage() {
  const { items, isEmpty, clear } = useCart();
  const { showToast }             = useToast();
  const dynamicConfig             = useConfig();
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
  const [pixKey,    setPixKey]    = useState('');
  const [payment,   setPayment]   = useState({ method: '', installments: 1 });
  const [paymentConfig, setPaymentConfig] = useState({ pix: true, credito: true, dinheiro: true });

  // Busca métodos de pagamento habilitados e chave PIX da API pública
  useEffect(() => {
    fetch('/api/config/public')
      .then(r => r.json())
      .then(data => {
        if (data.pix) setPixKey(data.pix);
        setPaymentConfig({
          pix:      data.pagamento_pix      !== 'false',
          credito:  data.pagamento_credito  !== 'false',
          dinheiro: data.pagamento_dinheiro !== 'false',
        });
      })
      .catch(() => {});
  }, []);

  // Busca a chave PIX do banco quando o método PIX é selecionado (fallback se ainda não carregou)
  const handleSelectPayment = (method) => {
    setPayment(p => ({ ...p, method }));
    if (method === 'PIX' && !pixKey) {
      fetch('/api/config/public')
        .then(r => r.json())
        .then(data => { if (data.pix) setPixKey(data.pix); })
        .catch(() => {});
    }
  };
  const [coupon,          setCoupon]          = useState(INITIAL_COUPON);
  const [changeFor,       setChangeFor]       = useState('');
  const [locationDetected, setLocationDetected] = useState(false);
  const [locating,         setLocating]         = useState(false);
  const [showMapModal,     setShowMapModal]     = useState(false);
  const [gpsFallbackCoords, setGpsFallbackCoords] = useState(null);
  const [savedAddresses,   setSavedAddresses]   = useState([]);
  const [pickerDismissed,  setPickerDismissed]  = useState(false);

  /* ── Detectar localização via GPS + abrir mapa para confirmação ── */
  const doDetectLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocalização não suportada pelo seu navegador.', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords;
          // Abre o mapa com as coordenadas detectadas para o usuário confirmar
          setGpsFallbackCoords({ lat, lon });
          setShowMapModal(true);
          showToast('Localização detectada! Ajuste no mapa se necessário.', 'success');
        } catch (err) {
          showToast('Erro ao processar localização', 'error');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === 1)
          showToast('Permissão de localização negada. Preencha o endereço manualmente.', 'warning');
        else if (err.code === 2)
          showToast('Não foi possível obter sua localização. Tente novamente.', 'warning');
        else
          showToast('Erro ao detectar localização. Preencha o endereço manualmente.', 'warning');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

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
        if (!delivery.referencia.trim()) errs.referencia = 'Informe um ponto de referência';
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
    // Se avançando do step 1 e CPF preenchido, busca endereços salvos silenciosamente
    if (step === 1 && customer.cpf) {
      const cpfLimpo = customer.cpf.replace(/\D/g, '');
      if (cpfLimpo.length === 11) {
        fetch(`/api/clientes/enderecos?cpf=${cpfLimpo}`)
          .then(r => r.json())
          .then(data => { if (data.enderecos?.length) setSavedAddresses(data.enderecos); })
          .catch(() => {});
      }
    }
    if (step === 2 && delivery.type === 'entrega') {
      const modelo = dynamicConfig?.frete?.modelo ?? 'VALOR';
      // FIXO e VALOR: calcula imediatamente sem precisar de endereço/geocode
      const autoCalc = modelo === 'FIXO' || modelo === 'VALOR';
      // CIDADE: calcula se já tiver a cidade (vem do CEP que é obrigatório no step 2)
      const cidadeCalc = modelo === 'CIDADE' && !!delivery.city;
      // KM: só calcula se não tiver custo ainda (vai precisar do botão "Calcular frete")
      const needsCalc = autoCalc || cidadeCalc ||
        (modelo === 'KM' && (delivery.shippingCost == null || delivery.shippingCost === 'pending'));

      if (needsCalc) {
        try { setLoading(true); setLoadTxt('Calculando frete…'); await doCalculateShipping(); }
        catch { showToast('Não foi possível calcular o frete agora.', 'warning'); }
        finally { setLoading(false); }
      }
    }
    goTo(step + 1);
  };

  const applyAddress = (addr) => {
    setDelivery(d => ({
      ...d,
      street:       addr.street       || '',
      number:       addr.number       || '',
      complement:   addr.complement   || '',
      neighborhood: addr.neighborhood || '',
      city:         addr.city         || '',
      state:        addr.state        || '',
      cep:          addr.cep ? addr.cep.slice(0,5)+'-'+addr.cep.slice(5) : '',
      referencia:   addr.referencia   || '',
      lat: null, lon: null, shippingCost: null, distanceKm: null,
    }));
    setLocationDetected(true);
    setPickerDismissed(true);
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
    const modelo = dynamicConfig?.frete?.modelo ?? 'VALOR';

    // FIXO e VALOR não precisam de endereço — calculam imediatamente
    if (modelo === 'FIXO' || modelo === 'VALOR') {
      const result = computeShippingCost(subtotal, null, '', dynamicConfig);
      setDelivery(d => ({ ...d, shippingCost: result.cost, shippingNote: result.note || '' }));
      return;
    }

    // CIDADE — precisa de cidade (vem do CEP), não precisa de geocodificação
    const city = overrides.city  || delivery.city;
    const stUF = overrides.state || delivery.state;
    const cep  = (overrides.cep  || delivery.cep).replace(/\D/g, '');

    if (modelo === 'CIDADE') {
      if (!city) { showToast('Informe o CEP para identificar a cidade.', 'error'); return; }
      const result = computeShippingCost(subtotal, null, city, dynamicConfig);
      setDelivery(d => ({ ...d, shippingCost: result.cost, shippingNote: result.note || '' }));
      return;
    }

    // KM — precisa de geocodificação de origem e destino
    if (!city || !stUF || !cep) { showToast('Informe CEP, cidade e estado.', 'error'); return; }

    setLoading(true); setLoadTxt('Calculando frete…');
    try {
      // Coordenadas de origem: banco > fallback geocode
      let originLat = dynamicConfig?.frete?.origemLat ?? CONFIG.ORIGIN.lat;
      let originLon = dynamicConfig?.frete?.origemLon ?? CONFIG.ORIGIN.lon;

      if (!originLat) {
        const endOrigem = dynamicConfig?.frete?.origemEndereco ||
          `${CONFIG.ORIGIN.STREET}, ${CONFIG.ORIGIN.CITY}, ${CONFIG.ORIGIN.STATE}`;
        const c = await geocodeAddress(endOrigem);
        if (c) { originLat = c.lat; originLon = c.lon; CONFIG.ORIGIN.lat = c.lat; CONFIG.ORIGIN.lon = c.lon; }
      }

      // Coordenadas de destino
      let destCoords = (overrides.lat && overrides.lon) ? { lat: overrides.lat, lon: overrides.lon } : null;
      if (!destCoords && delivery.street && delivery.number)
        destCoords = await geocodeAddress(`${delivery.street} ${delivery.number}, ${city} ${stUF}, ${cep}`);
      if (!destCoords)
        destCoords = await geocodeAddress(`${city}, ${stUF}, ${cep}`);

      const distKm = (destCoords && originLat)
        ? haversine(originLat, originLon, destCoords.lat, destCoords.lon)
        : (city.toLowerCase() === CONFIG.ORIGIN.CITY.toLowerCase() ? 5 : 15);

      const result = computeShippingCost(subtotal, distKm, city, dynamicConfig);
      setDelivery(d => ({ ...d, distanceKm: distKm, shippingCost: result.cost, shippingNote: result.note || '' }));
      showToast('Frete calculado!', 'success');
    } catch {
      showToast('Erro ao calcular frete.', 'error');
    } finally { setLoading(false); }
  }, [delivery, subtotal, dynamicConfig]);

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
          address:    `${delivery.street}, ${delivery.number}${delivery.complement ? ' – ' + delivery.complement : ''}, ${delivery.neighborhood}, ${delivery.city}/${delivery.state}${delivery.referencia ? ' — Ref: ' + delivery.referencia : ''}`,
          cep:        delivery.cep,
          frete:      typeof delivery.shippingCost === 'number' ? delivery.shippingCost : 0,
          distanceKm: delivery.distanceKm,
        });
      }

      const instFee  = (payment.method === 'Credito' && payment.installments > 1)
        ? CONFIG.INSTALLMENT_FEES[payment.installments] || 0 : 0;
      const finalTotal = +(total * (1 + instFee)).toFixed(2);

      const enderecoEstruturado = delivery.type === 'entrega' ? {
        street:       delivery.street,
        number:       delivery.number,
        complement:   delivery.complement || '',
        neighborhood: delivery.neighborhood,
        city:         delivery.city,
        state:        delivery.state,
        cep:          delivery.cep.replace(/\D/g,''),
        referencia:   delivery.referencia || '',
      } : null;

      const result = await reserveOrder({
        customer,
        items: itemsPayload,
        delivery: deliveryPayload,
        enderecoEstruturado,
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
        try { if (coupon.code) await consumeCoupon(coupon.code, result.orderId); } catch { /* ignore */ }

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

                    {/* ── Picker de endereços salvos ── */}
                    {savedAddresses.length > 0 && !pickerDismissed && !locationDetected && (
                      <div style={{
                        marginBottom:'1.25rem', padding:'1rem',
                        background:'var(--surface-muted)', borderRadius:'var(--r-lg)',
                        border:'1.5px solid var(--border)',
                      }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'.75rem' }}>
                          <p style={{ margin:0, fontWeight:700, fontSize:'.9rem' }}>Usar um endereço anterior?</p>
                          <button
                            onClick={() => setPickerDismissed(true)}
                            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:'1.1rem', lineHeight:1 }}
                            aria-label="Fechar"
                          >✕</button>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:'.5rem' }}>
                          {savedAddresses.map((addr, i) => (
                            <button key={i} onClick={() => applyAddress(addr)} style={{
                              textAlign:'left', padding:'.75rem 1rem',
                              background:'var(--surface)', border:'1.5px solid var(--border)',
                              borderRadius:'var(--r-md)', cursor:'pointer',
                              transition:'border-color var(--t-base)',
                              fontFamily:"'DM Sans', sans-serif",
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor='var(--accent)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
                            >
                              <p style={{ margin:0, fontWeight:600, fontSize:'.88rem' }}>
                                {addr.street}{addr.number ? `, ${addr.number}` : ''}{addr.complement ? ` – ${addr.complement}` : ''}
                              </p>
                              <p style={{ margin:'2px 0 0', fontSize:'.8rem', color:'var(--text-secondary)' }}>
                                {addr.neighborhood && `${addr.neighborhood}, `}{addr.city}/{addr.state}
                                {addr.referencia && ` — ${addr.referencia}`}
                              </p>
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setPickerDismissed(true)}
                          style={{
                            marginTop:'.75rem', width:'100%', padding:'.5rem',
                            background:'none', border:'1px dashed var(--border)',
                            borderRadius:'var(--r-sm)', cursor:'pointer',
                            fontSize:'.82rem', color:'var(--text-secondary)',
                            fontFamily:"'DM Sans', sans-serif",
                          }}
                        >
                          + Digitar novo endereço
                        </button>
                      </div>
                    )}

                    {/* ── Botão de detecção de localização ── */}
                    {!locationDetected ? (
                      <div style={{
                        display:'flex', flexDirection:'column', alignItems:'center',
                        gap:'.75rem', padding:'1.25rem', marginBottom:'1.25rem',
                        background:'var(--surface-muted)', border:'2px dashed var(--border)',
                        borderRadius:'var(--r-lg)',
                      }}>
                        <p style={{ margin:0, color:'var(--text-secondary)', fontSize:'.9rem', textAlign:'center' }}>
                          Quer preencher o endereço automaticamente?
                        </p>
                        <button
                          onClick={doDetectLocation}
                          disabled={locating}
                          style={{
                            display:'flex', alignItems:'center', gap:'.6rem',
                            height:'44px', padding:'0 1.5rem',
                            background: locating ? 'var(--surface-muted)' : 'var(--accent)',
                            color: locating ? 'var(--text-secondary)' : 'white',
                            border: locating ? '1.5px solid var(--border)' : 'none',
                            borderRadius:'var(--r-md)', fontWeight:700, fontSize:'.9rem',
                            cursor: locating ? 'not-allowed' : 'pointer',
                            transition:'all var(--t-base)', fontFamily:"'DM Sans', sans-serif",
                          }}
                        >
                          {locating ? (
                            <>
                              <span className="spinner spinner-sm" style={{ borderTopColor:'var(--accent)', borderColor:'rgba(0,0,0,.1)' }}/>
                              Detectando…
                            </>
                          ) : (
                            <>
                              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                                <path d="M12 8a4 4 0 100 8 4 4 0 000-8z" fill="currentColor" opacity=".15"/>
                              </svg>
                              Usar minha localização
                            </>
                          )}
                        </button>
                        <span style={{ fontSize:'.78rem', color:'var(--text-muted)' }}>
                          Usa o GPS do seu dispositivo — gratuito e sem compartilhar seus dados
                        </span>
                        <button
                          onClick={() => setShowMapModal(true)}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--accent)', fontSize:'.8rem', fontWeight:600, fontFamily:"'DM Sans', sans-serif", padding:0 }}
                        >
                          Prefiro escolher no mapa
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        display:'flex', alignItems:'center', gap:'.75rem',
                        padding:'1rem', marginBottom:'1.25rem',
                        background:'rgba(45,158,107,.08)', border:'1.5px solid var(--success)',
                        borderRadius:'var(--r-md)',
                      }}>
                        <CheckCircleIcon size={20} style={{ color:'var(--success)', flexShrink:0 }}/>
                        <div style={{ flex:1 }}>
                          <p style={{ margin:0, fontWeight:600, fontSize:'.9rem', color:'var(--success)' }}>
                            Localização detectada!
                          </p>
                          <p style={{ margin:'2px 0 0', fontSize:'.82rem', color:'var(--text-secondary)' }}>
                            Confira os campos abaixo e corrija o que precisar.
                          </p>
                        </div>
                        <button
                          onClick={() => { setLocationDetected(false); setDelivery(d => ({ ...d, street:'', number:'', neighborhood:'', city:'', state:'', cep:'', lat:null, lon:null, shippingCost:null })); }}
                          style={{
                            padding:'.3rem .7rem', fontSize:'.78rem', fontWeight:600,
                            background:'transparent', border:'1px solid var(--success)',
                            borderRadius:'var(--r-sm)', color:'var(--success)', cursor:'pointer',
                            flexShrink:0,
                          }}
                        >
                          Limpar
                        </button>
                      </div>
                    )}

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
                    <div className="form-group">
                      <label>Ponto de Referência *</label>
                      <input className="form-input"
                        placeholder="Ex: Próximo ao mercado X, casa de portão azul…"
                        value={delivery.referencia}
                        onChange={e => setDelivery(d => ({ ...d, referencia: e.target.value }))}/>
                      {E('referencia')}
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
                      {delivery.referencia && <p><strong>Referência:</strong> {delivery.referencia}</p>}
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
                    { key:'PIX',      Icon: PixIcon,        title:'PIX',              sub:'Aprovação imediata',        enabled: paymentConfig.pix      },
                    { key:'Dinheiro', Icon: BanknoteIcon,   title:'Dinheiro',         sub:'Pagar na entrega/retirada', enabled: paymentConfig.dinheiro  },
                    { key:'Credito',  Icon: CreditCardIcon, title:'Cartão de Crédito',sub:'Parcelamento disponível',   enabled: paymentConfig.credito   },
                  ].filter(m => m.enabled).map(({ key, Icon, title, sub }) => (
                    <div key={key}
                      className={`${styles.payMethod} ${payment.method === key ? styles.selected : ''}`}
                    onClick={() => handleSelectPayment(key)}
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
                    <span>
                      Após confirmar, você deverá realizar o pagamento via PIX.
                      {pixKey && (
                        <>
                          {' '}Chave PIX: <strong style={{ userSelect: 'all' }}>{pixKey}</strong>
                        </>
                      )}
                    </span>
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
      {/* Mapa de localização — GPS fallback ou escolha manual */}
      {showMapModal && (
        <LocationMapModal
          initialLat={gpsFallbackCoords?.lat}
          initialLon={gpsFallbackCoords?.lon}
          onConfirm={(addr) => {
            const rawCep = (addr.cep || '').replace(/\D/g,'');
            setDelivery(d => ({
              ...d,
              street:       addr.street       || d.street,
              number:       addr.number       || d.number,
              neighborhood: addr.neighborhood || d.neighborhood,
              city:         addr.city         || d.city,
              state:        addr.state        || d.state,
              cep:          rawCep.length===8 ? rawCep.slice(0,5)+'-'+rawCep.slice(5) : d.cep,
              referencia:   addr.referencia   || d.referencia,
              lat:          addr.lat,
              lon:          addr.lon,
              shippingCost: null, distanceKm: null,
            }));
            setLocationDetected(true);
            setShowMapModal(false);
            showToast('Localização confirmada! Confira os dados abaixo.', 'success');
            if (addr.city && addr.state) {
              doCalculateShipping({ city: addr.city, state: addr.state, cep: rawCep, lat: addr.lat, lon: addr.lon });
            }
          }}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </>
  );
}