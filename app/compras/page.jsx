'use client';
import { useState, useCallback, useRef } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PackageSearchIcon from '@/components/icons/PackageSearchIcon';
import { SearchIcon } from '@/components/icons/Icons';
import TurnstileWidget, { captchaAtivo } from '@/components/security/TurnstileWidget';
import { useToast } from '@/context/ToastContext';
import { checkOrder } from '@/lib/api';
import { applyCPFMask, applyPhoneMask } from '@/lib/utils';
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
  if (etapa === 'CANCELADO') {
    return TIMELINE_STEPS.map(step => ({ step, active: false, cancelled: true }));
  }
  const idx = STAGE_IDX[etapa] ?? 0;
  return TIMELINE_STEPS.map((step, i) => ({ step, active: i <= idx }));
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

function normaliseOrders(raw) {
  return raw.map(o => ({
    vdNumber:   String(o.idRastreio || o.vd || o.id || '').trim(),
    status:     mapStatus(o.etapa || o.status || ''),
    statusText: ETAPA_LABELS[o.etapa] || String(o.etapa || o.status || '').trim() || 'Reservado',
    products:   parseProducts(o.pedido || o.order || o.items || ''),
    total:      Number(o.totalVenda || o.total || 0) || 0,
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
   VD: começa com V, D, V-, VD ou VD-NNN
   CPF: qualquer outra coisa (dígitos)
─────────────────────────────────────────────────────── */
function detectMode(val) {
  return /^[VvDd]/.test(val) ? 'vd' : 'cpf';
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

  const mode = detectMode(input);
  const showPhoneField = mode === 'cpf' && input.length >= 3;

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
    const val = input.trim();
    if (!val) { showToast('Digite um CPF ou número VD', 'error'); return; }

    const vdOk  = /^VD-\d{1,6}$/i.test(val);
    const cpfOk = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(val);

    if (!vdOk && !cpfOk) {
      showToast('Formato inválido. Use CPF (000.000.000-00) ou VD (VD-001)', 'error');
      return;
    }

    if (cpfOk && !phone.trim()) {
      showToast('Informe o telefone de contato para buscar pelo CPF', 'error');
      return;
    }

    if (captchaAtivo() && !captchaToken) {
      showToast('Complete a verificação de segurança para buscar', 'error');
      return;
    }

    setUiState('loading');
    try {
      let found;

      if (vdOk) {
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
        showToast(`${found.length} pedido(s) encontrado(s)`, 'success');
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

  return (
    <>
      <Header backHref="/" backLabel="Loja" showSearch={false} showCart={false}/>

      <section className={styles.hero}>
        <PackageSearchIcon size={48} color="white"/>
        <p>Acompanhe seus pedidos</p>
      </section>

      <div className={styles.searchFloat}>
        <div className={styles.searchCard}>
          <div className={styles.searchIconWrap}>
            <SearchIcon size={26} className={styles.searchIconSvg}/>
          </div>
          <div>
            <h3>Busque suas compras</h3>
            <p>Pelo número VD ou CPF + telefone de contato</p>
          </div>
        </div>

        <div className={styles.searchForm}>
          <div className={styles.inputGroup}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="VD-001 ou CPF (000.000.000-00)"
              maxLength={18}
              value={input}
              onChange={handleInput}
              onKeyDown={e => { if (e.key === 'Enter') search(); }}
            />
            {showPhoneField && (
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Telefone de contato"
                maxLength={15}
                value={phone}
                onChange={e => setPhone(applyPhoneMask(e.target.value))}
                onKeyDown={e => { if (e.key === 'Enter') search(); }}
              />
            )}
            <button className={styles.btnSearch} onClick={search}>
              <SearchIcon size={18}/>
              Buscar
            </button>
          </div>
          <TurnstileWidget ref={captchaRef} onToken={setCaptchaToken} className={styles.captcha}/>
          <button className={styles.btnClear} onClick={clear}>Limpar</button>
        </div>
      </div>

      <section className={styles.results}>
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
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="1.25" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <h3>Nenhuma compra encontrada</h3>
            <p>Verifique os dados e tente novamente</p>
            <button className={`btn btn-primary ${styles.retryBtn}`} onClick={clear}>Tentar novamente</button>
          </div>
        )}
        {uiState === 'results' && (
          <div className={styles.grid}>
            {orders.map((order, i) => <OrderCard key={i} order={order}/>)}
          </div>
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
        <div className={styles.rowInfo}>
          <span className={styles.rowProducts} title={productSummary}>{productSummary}</span>
          <span className={styles.rowTotal}>R$ {order.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Etapas — stepper horizontal */}
      <div className={styles.rowTimeline}>
        {order.timeline.map((step, i) => (
          <div
            key={i}
            className={`${styles.htStep} ${step.active ? styles.htActive : ''} ${step.cancelled ? styles.htCancelled : ''}`}
          >
            <div className={styles.htDot} />
            <span className={styles.htLabel}>{step.step}</span>
          </div>
        ))}
      </div>
    </article>
  );
}