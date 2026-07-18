'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PackageSearchIcon from '@/components/icons/PackageSearchIcon';
import { SearchIcon, XCircleIcon } from '@/components/icons/Icons';
import TurnstileWidget, { captchaAtivo } from '@/components/security/TurnstileWidget';
import { useToast } from '@/context/ToastContext';
import { checkOrder } from '@/lib/api';
import { applyCPFMask, applyPhoneMask, validateCPF, formatBRL } from '@/lib/utils';
import styles from './page.module.css';

/* ── Etapas ──────────────────────────────────────────── */
const TIMELINE_STEPS = ['Reservado', 'Confirmado', 'Em separação', 'Saiu para entrega', 'Entregue'];

const STAGE_IDX = {
  'RESERVADO':          0,
  'CONFIRMADO':         1,
  'EM_PREPARO':         2,
  'SAIU_PARA_ENTREGA':  3,
  'ENTREGUE':           4,
  'CANCELADO':         -1,
};

const ETAPA_LABELS = {
  'RESERVADO':         'Reservado',
  'CONFIRMADO':        'Confirmado',
  'EM_PREPARO':        'Em separação',
  'SAIU_PARA_ENTREGA': 'Saiu para entrega',
  'ENTREGUE':          'Entregue',
  'CANCELADO':         'Cancelado',
};

function buildTimeline(etapa) {
  if (etapa === 'CANCELADO') return [];
  const idx = STAGE_IDX[etapa] ?? 0;
  return TIMELINE_STEPS.map((step, i) => ({ step, active: i <= idx, current: i === idx }));
}

function mapStatus(etapa) {
  switch (etapa) {
    case 'ENTREGUE':          return 'delivered';
    case 'EM_PREPARO':        return 'separating';
    case 'CONFIRMADO':        return 'confirmed';
    case 'SAIU_PARA_ENTREGA': return 'shipping';
    case 'CANCELADO':         return 'cancelled';
    default:                  return 'pending';
  }
}

function parseProducts(raw) {
  if (Array.isArray(raw)) return raw.map(p => typeof p === 'object'
    ? { name: p.name || p.descricao || String(p), qty: Number(p.qty || p.quantity || 1) || 1 }
    : { name: String(p), qty: 1 });
  const str = String(raw || '').trim();
  if (!str) return [{ name: 'Pedido registrado', qty: 1 }];
  return (str.includes('|') ? str.split('|') : str.split('/')).map(part => {
    const t = part.trim(), m = t.match(/^(.*?)(?:\s+x\s*(\d+))?\s*$/i);
    return m ? { name: (m[1] || t).trim(), qty: Number(m[2]) || 1 } : { name: t, qty: 1 };
  });
}

function formatDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString('pt-BR');
}

function normaliseOrders(raw) {
  return raw.map(o => ({
    vdNumber:   String(o.idRastreio || o.vd || o.id || '').trim(),
    status:     mapStatus(o.etapa || o.status || ''),
    statusText: ETAPA_LABELS[o.etapa] || String(o.etapa || o.status || '').trim() || 'Reservado',
    products:   parseProducts(o.pedido || o.order || o.items || ''),
    total:      Number(o.totalVenda || o.total || 0) || 0,
    date:       formatDate(o.dataCompra || o.date),
    cancelled:  (o.etapa || o.status) === 'CANCELADO',
    timeline:   buildTimeline(o.etapa || o.status || 'RESERVADO'),
  }));
}

const STATUS_CLS = {
  pending:    styles.statusPending,
  confirmed:  styles.statusConfirmed,
  separating: styles.statusSeparating,
  shipping:   styles.statusShipping,
  delivered:  styles.statusDelivered,
  cancelled:  styles.statusCancelled,
};

/* ── Detecta modo de input ─────────────────────────────
   VD: começa com V ou D (ex: VD-012, vd12)
   CPF: qualquer outra coisa (dígitos)
─────────────────────────────────────────────────────── */
function detectMode(val) {
  return /^[VvDd]/.test(val) ? 'vd' : 'cpf';
}

function pluralPedidos(n) {
  return n === 1 ? '1 pedido encontrado' : `${n} pedidos encontrados`;
}

/* ── Component ─────────────────────────────────────── */
export default function ComprasPage() {
  const { showToast } = useToast();

  const [input,    setInput]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [uiState,  setUiState]  = useState('empty');
  const [orders,   setOrders]   = useState([]);
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);
  const inputRef   = useRef(null);
  const resultsRef = useRef(null);

  const mode = detectMode(input);
  const showPhoneField = mode === 'cpf' && input.length >= 3;
  const loading = uiState === 'loading';

  /* Depois de buscar, garante que o retorno fique visível (no celular o
     resultado nasce abaixo da dobra). Só rola se estiver longe da vista. */
  useEffect(() => {
    if (uiState !== 'loading' && uiState !== 'results' && uiState !== 'no-results') return;
    const el = resultsRef.current;
    if (el && el.getBoundingClientRect().top > window.innerHeight * 0.45) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [uiState]);

  /* Formata conforme o modo */
  const handleInput = (e) => {
    const raw = e.target.value;
    if (/^[VvDd]/.test(raw)) {
      // modo VD: só letras e dígitos permitidos (ex: VD-012)
      setInput(raw.toUpperCase().replace(/[^VD0-9\-]/g, '').slice(0, 10));
    } else {
      setInput(applyCPFMask(raw));
    }
  };

  const search = useCallback(async () => {
    let val = input.trim();
    if (!val) { showToast('Digite um CPF ou número VD', 'error'); return; }

    const isVd = detectMode(val) === 'vd';

    if (isVd) {
      // Aceita variações como "VD012" ou "vd 12" e normaliza para VD-NNN.
      const digits = val.replace(/\D/g, '');
      if (!digits || digits.length > 6) {
        showToast('Número VD inválido. Exemplo: VD-001', 'error');
        return;
      }
      val = `VD-${digits}`;
      if (val !== input) setInput(val);
    } else {
      const cpfClean = val.replace(/\D/g, '');
      if (!validateCPF(cpfClean)) {
        showToast('Digite um CPF válido para buscar', 'error');
        return;
      }
      if (!phone.trim()) {
        showToast('Informe o telefone de contato para buscar pelo CPF', 'error');
        return;
      }
    }

    if (captchaAtivo() && !captchaToken) {
      showToast('Complete a verificação de segurança para buscar', 'error');
      return;
    }

    setUiState('loading');
    try {
      let found;

      if (isVd) {
        const res = await checkOrder(val, captchaToken);
        found = res.order ? normaliseOrders([res.order]) : [];
      } else {
        // Busca por CPF com validação de telefone no backend
        const cpfClean   = val.replace(/\D/g, '');
        const phoneClean = phone.replace(/\D/g, '');
        const res = await fetch(
          `/api/pedidos/rastrear?cpf=${cpfClean}&phone=${phoneClean}`,
          { headers: captchaToken ? { 'X-Captcha-Token': captchaToken } : {} }
        );
        if (res.status === 401 || res.status === 403) {
          const data = await res.json();
          showToast(data.erro || 'Dados não conferem', 'error');
          setUiState('no-results');
          return;
        }
        const data = await res.json();
        found = normaliseOrders(data.pedidos || []);
      }

      if (found.length) {
        setOrders(found);
        setUiState('results');
        showToast(pluralPedidos(found.length), 'success');
      } else {
        setUiState('no-results');
        showToast('Nenhum pedido encontrado', 'info');
      }
    } catch (err) {
      setUiState('no-results');
      showToast(err.message || 'Erro ao buscar pedidos', 'error');
    } finally {
      // Tokens do captcha são de uso único — renova para a próxima busca.
      captchaRef.current?.reset();
    }
  }, [input, phone, captchaToken, showToast]);

  const clear = () => { setInput(''); setPhone(''); setUiState('empty'); setOrders([]); };

  /* Volta ao formulário mantendo o que foi digitado — quem errou um
     dígito não precisa preencher tudo de novo. */
  const retry = () => {
    setUiState('empty');
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const onEnter = (e) => { if (e.key === 'Enter' && !loading) search(); };

  return (
    <>
      <Header backHref="/" backLabel="Loja" showSearch={false} showCart={false}/>

      <section className={styles.hero}>
        <PackageSearchIcon size={48} color="white"/>
        <h1>Acompanhe seus pedidos</h1>
        <p>Veja em que etapa está a sua compra</p>
      </section>

      <div className={styles.searchFloat}>
        <div className={styles.searchPanel}>
          <div className={styles.panelHead}>
            <div className={styles.searchIconWrap}>
              <SearchIcon size={24} className={styles.searchIconSvg}/>
            </div>
            <div>
              <h2>Busque suas compras</h2>
              <p>Pelo número VD do pedido, ou pelo seu CPF e telefone de contato</p>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="track-query">Número VD ou CPF</label>
            <input
              id="track-query"
              ref={inputRef}
              className={styles.searchInput}
              type="text"
              placeholder="VD-001 ou 000.000.000-00"
              maxLength={14}
              value={input}
              onChange={handleInput}
              onKeyDown={onEnter}
            />
          </div>

          <div className={`${styles.phoneReveal} ${showPhoneField ? styles.phoneOpen : ''}`}>
            <div className={styles.phoneInner}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="track-phone">Telefone de contato</label>
                <input
                  id="track-phone"
                  className={styles.searchInput}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  value={phone}
                  onChange={e => setPhone(applyPhoneMask(e.target.value))}
                  onKeyDown={onEnter}
                />
                <span className={styles.hint}>Usamos o telefone do cadastro para confirmar que o CPF é seu</span>
              </div>
            </div>
          </div>

          <TurnstileWidget ref={captchaRef} onToken={setCaptchaToken} className={styles.captcha}/>

          <div className={styles.actions}>
            <button className={`btn btn-primary ${styles.btnSearch}`} onClick={search} disabled={loading}>
              {loading ? <span className="spinner spinner-sm"/> : <SearchIcon size={18}/>}
              {loading ? 'Buscando…' : 'Buscar'}
            </button>
            <button className={`btn btn-secondary ${styles.btnClear}`} onClick={clear} disabled={loading}>
              Limpar
            </button>
          </div>
        </div>
      </div>

      <section className={styles.results} ref={resultsRef}>
        {uiState === 'empty' && (
          <div className={styles.emptyState}>
            <PackageSearchIcon size={100} color="var(--border-strong)"/>
            <h3>Nenhuma busca realizada</h3>
            <p>Use o número VD do seu pedido, ou o CPF + telefone cadastrado</p>
          </div>
        )}
        {uiState === 'loading' && (
          <div className="loading-center"><div className="spinner"/><p>Buscando seus pedidos…</p></div>
        )}
        {uiState === 'no-results' && (
          <div className={styles.emptyState}>
            <XCircleIcon size={80} className={styles.noResultsIcon}/>
            <h3>Nenhuma compra encontrada</h3>
            <p>Verifique os dados e tente novamente</p>
            <button className={`btn btn-primary ${styles.retryBtn}`} onClick={retry}>Tentar novamente</button>
          </div>
        )}
        {uiState === 'results' && (
          <>
            <p className={styles.resultCount} role="status">{pluralPedidos(orders.length)}</p>
            <div className={styles.grid}>
              {orders.map((order, i) => <OrderCard key={i} order={order}/>)}
            </div>
          </>
        )}
      </section>

      <Footer/>
    </>
  );
}

function OrderCard({ order }) {
  const productSummary = order.products.map(p => `${p.qty}× ${p.name}`).join(' • ');
  return (
    <article className={styles.row}>
      {/* Informações do pedido */}
      <div className={styles.rowMain}>
        <div className={styles.rowHeader}>
          <span className={styles.orderNum}>{order.vdNumber || '—'}</span>
          <span className={`${styles.status} ${STATUS_CLS[order.status] || styles.statusPending}`}>
            {order.statusText || 'Reservado'}
          </span>
        </div>
        {order.date && <span className={styles.rowDate}>Pedido feito em {order.date}</span>}
        <div className={styles.rowInfo}>
          <span className={styles.rowProducts} title={productSummary}>{productSummary}</span>
          <span className={styles.rowTotal}>{formatBRL(order.total)}</span>
        </div>
      </div>

      {/* Etapas — stepper horizontal (ou aviso, se cancelado) */}
      {order.cancelled ? (
        <div className={styles.cancelledNote}>
          <XCircleIcon size={22}/>
          <div>
            <strong>Pedido cancelado</strong>
            <span>Se tiver alguma dúvida, fale com a gente pelos contatos abaixo</span>
          </div>
        </div>
      ) : (
        <ol className={styles.rowTimeline} aria-label="Etapas do pedido">
          {order.timeline.map((step, i) => (
            <li
              key={i}
              className={`${styles.htStep} ${step.active ? styles.htActive : ''}`}
              aria-current={step.current ? 'step' : undefined}
            >
              <span className={styles.htDot} aria-hidden="true">
                {step.active && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                )}
              </span>
              <span className={styles.htLabel}>{step.step}</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
