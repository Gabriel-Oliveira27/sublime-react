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
  ShoppingCartIcon,
} from '@/components/icons/Icons';
import { useCart } from '@/context/CartContext';
import { useConfig } from '@/context/ConfigContext';
import TurnstileWidget, { captchaAtivo } from '@/components/security/TurnstileWidget';
import LocationMapModal from '@/components/store/LocationMapModal';
import { useToast } from '@/context/ToastContext';
import { CONFIG } from '@/lib/config';
import {
  validateCPF, applyPhoneMask, applyCPFMask, applyCEPMask,
  parseCurrency, formatDateBR, computeShippingCost, haversine,
} from '@/lib/utils';
import { lookupCEP, geocodeAddress, reserveOrder, consumeCoupon } from '@/lib/api';
import { calcularTaxaPix } from '@/lib/pixFee';
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
  const [payment,   setPayment]   = useState({ method: '', installments: 1, online: true });
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
    setPayment(p => ({
      ...p,
      method,
      // PIX + online ligado → mantém a escolha (padrão: instantâneo). Fora disso, sem taxa.
      online: method === 'PIX' && !!dynamicConfig?.pixOnline?.ativo ? p.online : false,
    }));
    if (method === 'PIX' && !pixKey) {
      fetch('/api/config/public')
        .then(r => r.json())
        .then(data => { if (data.pix) setPixKey(data.pix); })
        .catch(() => {});
    }
  };
  const [coupon,          setCoupon]          = useState(INITIAL_COUPON);
  const [changeFor,       setChangeFor]       = useState('');
  const [captchaToken,    setCaptchaToken]    = useState(null);
  const [summaryOpen,     setSummaryOpen]     = useState(false);
  const captchaRef                            = useRef(null);
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

  /* ── PIX instantâneo (online) + taxa de serviço ── */
  const pixCfg              = dynamicConfig?.pixOnline;
  const pixOnlineDisponivel = !!pixCfg?.ativo;
  const isPixInstant        = payment.method === 'PIX' && payment.online === true && pixOnlineDisponivel;
  // Apenas informativo — o servidor recalcula e é a fonte de verdade.
  const serviceFee          = isPixInstant ? calcularTaxaPix(total, pixCfg) : 0;

  /* Animação "recalculando" no resumo quando o PIX instantâneo é (des)ativado —
     dá visibilidade à taxa de serviço antes de o cliente fechar o pedido. */
  const [feeRecalc, setFeeRecalc] = useState(false);
  const feeRecalcTimer = useRef(null);
  const firstFeeRender = useRef(true);
  useEffect(() => {
    if (firstFeeRender.current) { firstFeeRender.current = false; return; }
    setFeeRecalc(true);
    clearTimeout(feeRecalcTimer.current);
    feeRecalcTimer.current = setTimeout(() => setFeeRecalc(false), 900);
    return () => clearTimeout(feeRecalcTimer.current);
  }, [isPixInstant]);

  const goTo = (n) => { setStep(n); setSummaryOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  /* Total exibido na barra mobile — mesmo cálculo do resumo (juros + taxa PIX) */
  const displayTotal = +(total * (1 + installmentFee) + (isPixInstant ? serviceFee : 0)).toFixed(2);

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

  /* ── Enter avança a etapa (desktop) ──
     Em qualquer input/select do formulário, Enter tenta avançar — a validação
     da etapa continua valendo. Botões/links ficam de fora (Enter neles já
     dispara o clique nativo). */
  const onStepKeyDown = (e) => {
    if (e.key !== 'Enter' || loading) return;
    const tag = e.target.tagName;
    if (tag !== 'INPUT' && tag !== 'SELECT') return;
    e.preventDefault();
    if (step === 4) finishOrder();
    else nextStep();
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
    if (captchaAtivo() && !captchaToken) {
      showToast('Complete a verificação de segurança para finalizar', 'error');
      return;
    }
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
      // total enviado é só informativo — o servidor recalcula subtotal, frete,
      // desconto E a taxa de serviço do PIX a partir do banco (anti-tampering).
      const finalTotal = +((total * (1 + instFee)) + serviceFee).toFixed(2);

      // Na retirada não há endereço de entrega — enviar `undefined` (o campo
      // some do JSON). `null` explícito era rejeitado pelo schema da API.
      const enderecoEstruturado = delivery.type === 'entrega' ? {
        street:       delivery.street,
        number:       delivery.number,
        complement:   delivery.complement || '',
        neighborhood: delivery.neighborhood,
        city:         delivery.city,
        state:        delivery.state,
        cep:          delivery.cep.replace(/\D/g,''),
        referencia:   delivery.referencia || '',
      } : undefined;

      const result = await reserveOrder({
        customer,
        items: itemsPayload,
        delivery: deliveryPayload,
        enderecoEstruturado,
        payment: {
          method:       payment.method,
          installments: Number(payment.installments),
          changeFor:    payment.method === 'Dinheiro' ? parseCurrency(changeFor) : '',
          online:       isPixInstant,
        },
        coupon:       coupon.code || '',
        subtotal:     +subtotal.toFixed(2),
        total:        finalTotal,
        captchaToken: captchaToken || undefined,
      });

      if (result.success) {
        /* Non-critical — wrapped so it never blocks the success screen */
        try { if (coupon.code) await consumeCoupon(coupon.code, result.orderId); } catch { /* ignore */ }

        /* CRITICAL: set guard BEFORE clear() so isEmpty effect doesn't redirect */
        orderPlacedRef.current = true;
        clear();
        setSuccessData({ orderId: result.orderId || result.orderCode || 'N/A', pix: result.pix || null });
      } else {
        throw new Error(result.error || result.message || 'Erro ao processar pedido');
      }
    } catch (err) {
      showToast(err.message || 'Erro ao processar pedido', 'error');
    } finally {
      setLoading(false);
      // Tokens do captcha são de uso único — renova para nova tentativa.
      captchaRef.current?.reset();
    }
  };

  const installmentOptions = Array.from({ length: CONFIG.STORE.MAX_INSTALLMENTS }, (_, i) => {
    const n = i + 1, fee = CONFIG.INSTALLMENT_FEES[n] || 0, tot = total * (1 + fee);
    return { n, label: total > 0 ? `${n}x de R$ ${(tot/n).toFixed(2)} (Total R$ ${tot.toFixed(2)})` : `${n}x de R$ 0,00` };
  });

  const E = (key) => errors[key] ? <span className="error-message">{errors[key]}</span> : null;

  const STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

  /* Slots de retirada de 30 em 30 min dentro da janela configurada no
     dashboard (RETIRADA_HORA_INICIO/FIM). Ex.: 08:00–13:00 → 08:00, 08:30… 13:00 */
  const TIMES = (() => {
    const toMin = (s) => {
      const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
      return m ? Math.min(23, parseInt(m[1])) * 60 + (parseInt(m[2]) >= 30 ? 30 : 0) : null;
    };
    let ini = toMin(dynamicConfig?.retiradaHorario?.inicio) ?? 8 * 60;
    let fim = toMin(dynamicConfig?.retiradaHorario?.fim)    ?? 19 * 60;
    if (fim < ini) [ini, fim] = [fim, ini];
    const slots = [];
    for (let t = ini; t <= fim; t += 30) {
      slots.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
    }
    return slots;
  })();

  /* Formas de recebimento habilitadas no dashboard. Se as duas estiverem
     desligadas (config quebrada), mantém as duas — a loja nunca fica sem opção. */
  const recebCfg   = dynamicConfig?.recebimento ?? { entrega: true, retirada: true };
  const nenhumaOn  = !recebCfg.entrega && !recebCfg.retirada;
  const retiradaOn = recebCfg.retirada || nenhumaOn;
  const entregaOn  = recebCfg.entrega  || nenhumaOn;

  // Só uma forma disponível → já entra selecionada na etapa 2
  useEffect(() => {
    if (!dynamicConfig?.loaded || delivery.type) return;
    if (retiradaOn && !entregaOn) setDelivery(d => ({ ...d, type: 'retirada', shippingCost: 0 }));
    else if (entregaOn && !retiradaOn) setDelivery(d => ({ ...d, type: 'entrega' }));
  }, [dynamicConfig?.loaded, retiradaOn, entregaOn, delivery.type]);

  return (
    <>
      <Header
        backLabel="Loja"
        showSearch={false}
        showCart={false}
        onBackClick={() => setShowExitConfirm(true)}
      />

      {/* ── Modal confirmação de saída ───────────────────────────── */}
      {showExitConfirm && (
        <div className={styles.exitOverlay}>
          <div className={styles.exitModal}>
            <div className={styles.exitIcon}>
              <ShoppingCartIcon size={40} />
            </div>
            <h3>Sair do checkout?</h3>
            <p>Seu carrinho será mantido, mas o progresso desta etapa será perdido.</p>
            <div className={styles.exitActions}>
              <button className="btn btn-secondary" onClick={() => setShowExitConfirm(false)}>
                Continuar comprando
              </button>
              <button className="btn btn-primary" onClick={() => router.push('/')}>
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
      <StepIndicator currentStep={step} />

      <main className={styles.main}>
        <div className={styles.grid}>

          <div className={styles.form} onKeyDown={onStepKeyDown}>

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
                    { key: 'retirada', Icon: MapPinIcon, title: 'Retirada', sub: 'Buscar no local — grátis', enabled: retiradaOn },
                    { key: 'entrega',  Icon: TruckIcon,  title: 'Entrega',  sub: 'Receber em casa',          enabled: entregaOn },
                  ].filter(o => o.enabled).map(({ key, Icon, title, sub }) => (
                    <button key={key} type="button"
                      className={`${styles.delivOpt} ${delivery.type === key ? styles.selected : ''}`}
                      aria-pressed={delivery.type === key}
                      onClick={() => setDelivery(d => ({ ...d, type: key, shippingCost: key === 'retirada' ? 0 : d.shippingCost }))}
                    >
                      <Icon size={28} className={styles.delivOptIcon}/>
                      <span className={styles.optTitle}>{title}</span>
                      <span className={styles.optSub}>{sub}</span>
                    </button>
                  ))}
                </div>

                {delivery.type === 'retirada' && (
                  <>
                    <div className="info-box"><strong>Endereço de Retirada</strong><br/>{CONFIG.ORIGIN.DISPLAY}</div>
                    {customer.name.trim() && delivery.pickupWho.trim() !== customer.name.trim() && (
                      <button type="button" className={styles.selfPickupBtn}
                        onClick={() => setDelivery(d => ({ ...d, pickupWho: customer.name.trim() }))}>
                        <CheckCircleIcon size={15}/> Eu mesmo vou retirar
                      </button>
                    )}
                    <div className={styles.pickupRow}>
                      <div className="form-group">
                        <label>Quem vai retirar? *</label>
                        <input className="form-input" placeholder="Nome completo" value={delivery.pickupWho}
                          onChange={e => setDelivery(d => ({ ...d, pickupWho: e.target.value }))}/>
                        {E('pickupWho')}
                      </div>
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
                      <div className={styles.savedBox}>
                        <div className={styles.savedHead}>
                          <p>Usar um endereço anterior?</p>
                          <button type="button" className={styles.savedClose}
                            onClick={() => setPickerDismissed(true)} aria-label="Fechar">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                        <div className={styles.savedList}>
                          {savedAddresses.map((addr, i) => (
                            <button key={i} type="button" className={styles.savedItem} onClick={() => applyAddress(addr)}>
                              <span className={styles.savedItemLine1}>
                                {addr.street}{addr.number ? `, ${addr.number}` : ''}{addr.complement ? ` – ${addr.complement}` : ''}
                              </span>
                              <span className={styles.savedItemLine2}>
                                {addr.neighborhood && `${addr.neighborhood}, `}{addr.city}/{addr.state}
                                {addr.referencia && ` — ${addr.referencia}`}
                              </span>
                            </button>
                          ))}
                        </div>
                        <button type="button" className={styles.savedNewBtn} onClick={() => setPickerDismissed(true)}>
                          + Digitar novo endereço
                        </button>
                      </div>
                    )}

                    {/* ── Detecção de localização ──
                        Com endereços salvos na tela, o convite do GPS encolhe
                        para uma linha — evita dois blocões empilhados. */}
                    {!locationDetected ? (
                      savedAddresses.length > 0 && !pickerDismissed ? (
                        <div className={styles.gpsCompact}>
                          <button type="button" onClick={doDetectLocation} disabled={locating}>
                            {locating ? 'Detectando…' : 'ou usar minha localização'}
                          </button>
                          <span>·</span>
                          <button type="button" onClick={() => setShowMapModal(true)}>
                            escolher no mapa
                          </button>
                        </div>
                      ) : (
                      <div className={styles.gpsBox}>
                        <p className={styles.gpsText}>Quer preencher o endereço automaticamente?</p>
                        <button type="button" className={styles.gpsBtn} onClick={doDetectLocation} disabled={locating}>
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
                        <span className={styles.gpsNote}>
                          Usa o GPS do seu dispositivo — gratuito e sem compartilhar seus dados
                        </span>
                        <button type="button" className={styles.gpsMapLink} onClick={() => setShowMapModal(true)}>
                          Prefiro escolher no mapa
                        </button>
                      </div>
                      )
                    ) : (
                      <div className={styles.locBanner}>
                        <CheckCircleIcon size={20} className={styles.locBannerIcon}/>
                        <div className={styles.locBannerText}>
                          <p className={styles.locBannerTitle}>Localização detectada!</p>
                          <p className={styles.locBannerSub}>Confira os campos abaixo e corrija o que precisar.</p>
                        </div>
                        <button type="button" className={styles.locClearBtn}
                          onClick={() => { setLocationDetected(false); setDelivery(d => ({ ...d, street:'', number:'', neighborhood:'', city:'', state:'', cep:'', lat:null, lon:null, shippingCost:null })); }}
                        >
                          Limpar
                        </button>
                      </div>
                    )}

                    <div className="form-group">
                      <label>CEP *</label>
                      <div className={styles.cepRow}>
                        <input className="form-input" placeholder="00000-000" inputMode="numeric"
                          value={delivery.cep}
                          onChange={e => setDelivery(d => ({ ...d, cep: applyCEPMask(e.target.value) }))}
                          onKeyDown={e => {
                            // Enter no CEP busca o endereço (não pula a etapa)
                            if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); doSearchCEP(); }
                          }}/>
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
                    <button key={key} type="button"
                      className={`${styles.payMethod} ${payment.method === key ? styles.selected : ''}`}
                      aria-pressed={payment.method === key}
                      onClick={() => handleSelectPayment(key)}
                    >
                      <div className={styles.payIcon}><Icon size={key === 'PIX' ? 36 : 28}/></div>
                      <span className={styles.optTitle}>{title}</span>
                      <span className={styles.optSub}>{sub}</span>
                    </button>
                  ))}
                </div>

                {payment.method === 'PIX' && pixOnlineDisponivel && (
                  <div className={styles.pixOptions}>
                    {[
                      { on:true,  title:'Pagar agora (instantâneo)',
                        sub: serviceFee > 0
                          ? `Confirma na hora • taxa de serviço R$ ${serviceFee.toFixed(2)} — seu pedido sai mais rápido`
                          : 'Confirma na hora — seu pedido sai mais rápido' },
                      { on:false, title:'Pagar na retirada/entrega',
                        sub:'PIX na hora do recebimento' },
                    ].map(opt => (
                      <button key={String(opt.on)} type="button"
                        className={`${styles.pixOpt} ${payment.online === opt.on ? styles.pixOptActive : ''}`}
                        aria-pressed={payment.online === opt.on}
                        onClick={() => setPayment(p => ({ ...p, online: opt.on }))}>
                        <span className={styles.pixOptTitle}>{opt.title}</span>
                        <span className={styles.pixOptSub}>{opt.sub}</span>
                      </button>
                    ))}
                  </div>
                )}

                {payment.method === 'PIX' && (
                  <div className={styles.infoBox} style={{ marginTop:'1rem' }}>
                    <InfoIcon size={18}/>
                    <span>
                      {isPixInstant
                        ? 'Após confirmar, você verá o QR Code e o Copia e Cola para pagar na hora. A confirmação é automática.'
                        : pixOnlineDisponivel
                          // PIX na hora do recebimento: a chave só é apresentada
                          // pelo vendedor no ato — não expor a chave cadastrada.
                          ? 'Você pagará via PIX no momento da retirada/entrega, direto com o vendedor.'
                          : <>Você pagará via PIX na retirada/entrega.{pixKey && <> Chave PIX: <strong style={{ userSelect:'all' }}>{pixKey}</strong></>}</>}
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
                      <input className="form-input" type="text" inputMode="decimal" placeholder="Ex: 100,00"
                        value={changeFor} onChange={e => setChangeFor(e.target.value.replace(/[^\d.,]/g,''))}/>
                      {(() => {
                        // Feedback imediato do troco — o mesmo cálculo é refeito no servidor
                        const dado = parseCurrency(changeFor);
                        if (dado > total) return (
                          <p className={styles.trocoHint}>
                            Você receberá <strong>R$ {(dado - total).toFixed(2)}</strong> de troco
                          </p>
                        );
                        if (dado > 0 && dado < total) return (
                          <p className={styles.trocoWarn}>
                            Valor menor que o total do pedido (R$ {total.toFixed(2)})
                          </p>
                        );
                        return null;
                      })()}
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

                <TurnstileWidget
                  ref={captchaRef}
                  onToken={setCaptchaToken}
                  className={styles.captcha}
                />

                <div className={styles.actions}>
                  <button className="btn btn-secondary" onClick={() => goTo(3)}>← Voltar</button>
                  <button className={`btn btn-primary ${styles.finishBtn}`} onClick={finishOrder} disabled={loading}>
                    {loading
                      ? <><span className="spinner spinner-sm" style={{ borderTopColor:'white', borderColor:'rgba(255,255,255,.3)' }}/>&nbsp;Processando…</>
                      // PIX instantâneo leva ao QR Code — o rótulo alinha a expectativa
                      : isPixInstant ? 'Pagar agora com PIX' : 'Reservar Pedido'}
                  </button>
                </div>
              </div>
            )}

          </div>{/* /.form */}

          {/* No desktop é a coluna direita fixa; no mobile vira um bottom
              sheet aberto pela barra de total (ver .summaryWrap no CSS). */}
          <div className={`${styles.summaryWrap} ${summaryOpen ? styles.summaryWrapOpen : ''}`}>
            <OrderSummary
              cart={items}
              subtotal={subtotal}
              shipping={shipping}
              discount={discount}
              total={total}
              paymentMethod={payment.method}
              installments={payment.installments}
              installmentFee={installmentFee}
              serviceFee={serviceFee}
              serviceFeeActive={isPixInstant}
              serviceFeeRecalc={feeRecalc}
              serviceFeeInfo={dynamicConfig?.pixTaxaFrase || ''}
              onCouponApplied={(c) => {
                setCoupon(c);
                if (c.type === 'fretegratis') setDelivery(d => ({ ...d, shippingCost: 0 }));
              }}
            />
          </div>

        </div>
      </main>

      {/* Barra de total no mobile — o cliente vê o total em qualquer etapa
          e toca para expandir o resumo completo (itens, frete, cupom). */}
      {!successData && (
        <>
          {summaryOpen && <div className={styles.summaryOverlay} onClick={() => setSummaryOpen(false)} />}
          <button
            type="button"
            className={styles.summaryBar}
            onClick={() => setSummaryOpen(o => !o)}
            aria-expanded={summaryOpen}
          >
            <span className={styles.summaryBarInfo}>
              <span className={styles.summaryBarLabel}>
                {summaryOpen ? 'Fechar resumo' : 'Ver resumo do pedido'}
              </span>
              <span className={styles.summaryBarTotal}>R$ {displayTotal.toFixed(2)}</span>
            </span>
            <svg
              className={`${styles.summaryBarChevron} ${summaryOpen ? styles.summaryBarChevronOpen : ''}`}
              width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
        </>
      )}

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
          pix={successData.pix}
          pixOnlineAtivo={pixOnlineDisponivel}
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