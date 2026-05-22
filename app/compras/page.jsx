'use client';
import { useState, useCallback } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PackageSearchIcon from '@/components/icons/PackageSearchIcon';
import { MapPinIcon, PackageIcon, CheckCircleIcon, SearchIcon } from '@/components/icons/Icons';
import { useToast } from '@/context/ToastContext';
import { trackByCPF, checkOrder } from '@/lib/api';
import { applyCPFMask } from '@/lib/utils';
import styles from './page.module.css';

/* ── helpers ── */
// Etapas lineares exibidas na timeline (Cancelado é tratado à parte)
const TIMELINE_STEPS = ['Reservado', 'Confirmado', 'Em separação', 'Saiu para entrega', 'Entregue'];

// Mapa das etapas do banco (enum EtapaPedido) para o índice da timeline
const STAGE_IDX = {
  'RESERVADO':          0,
  'CONFIRMADO':         1,
  'EM_PREPARO':         2,
  'SAIU_PARA_ENTREGA':  3,
  'ENTREGUE':           4,
  'CANCELADO':         -1, // fora da timeline linear
};

// Rótulos de exibição para cada etapa do banco
const ETAPA_LABELS = {
  'RESERVADO':         'Reservado',
  'CONFIRMADO':        'Confirmado',
  'EM_PREPARO':        'Em separação',
  'SAIU_PARA_ENTREGA': 'Saiu para entrega',
  'ENTREGUE':          'Entregue',
  'CANCELADO':         'Cancelado',
};

function buildTimeline(etapa) {
  const idx = STAGE_IDX[etapa] ?? 0;
  if (etapa === 'CANCELADO') {
    return TIMELINE_STEPS.map(step => ({ step, active: false, cancelled: true }));
  }
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
  if (Array.isArray(raw)) return raw.map(p=>typeof p==='object'
    ?{name:p.name||p.descricao||String(p),qty:Number(p.qty||p.quantity||p.qtd||1)||1,price:Number(p.price||p.valor||0)}
    :{name:String(p),qty:1,price:0});
  const str=String(raw||'').trim();
  if(!str) return [{name:'Pedido registrado',qty:1,price:0}];
  return (str.includes('|')?str.split('|'):str.split('/')).map(part=>{
    const t=part.trim(), m=t.match(/^(.*?)(?:\s+x\s*(\d+))?\s*$/i);
    return m?{name:(m[1]||t).trim(),qty:Number(m[2])||1,price:0}:{name:t,qty:1,price:0};
  });
}
function normaliseOrders(raw) {
  return raw.map(o=>({
    vdNumber:   String(o.vd||o.id||o.idRastreio||o['Id rastreio']||'').trim(),
    status:     mapStatus(o.etapa||o.status||''),
    statusText: ETAPA_LABELS[o.etapa] || String(o.etapa||o.status||'').trim(),
    products:   parseProducts(o.pedido||o.order||o.items||''),
    total:      Number(o.total||o['Total da venda']||o.valor||0)||0,
    timeline:   buildTimeline(o.etapa||o.status||''),
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

/* ── component ── */
export default function ComprasPage() {
  const { showToast } = useToast();
  const [input,  setInput]  = useState('');
  const [uiState,setUiState]= useState('empty');
  const [orders, setOrders] = useState([]);

  const handleInput = (e) => {
    const v = e.target.value;
    setInput(v.toUpperCase().startsWith('VD') ? v.toUpperCase() : applyCPFMask(v));
  };

  const search = useCallback(async () => {
    const val = input.trim();
    if (!val) { showToast('Digite um CPF ou número da VD','error'); return; }
    const cpfOk = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(val);
    const vdOk  = /^VD-\d+$/i.test(val);
    if (!cpfOk && !vdOk) { showToast('Formato inválido. Use CPF (000.000.000-00) ou VD (VD-001)','error'); return; }

    setUiState('loading');
    try {
      let found;
      if (vdOk) {
        const res = await checkOrder(val);
        found = res.order ? normaliseOrders([res.order]) : [];
      } else {
        const res = await trackByCPF(val);
        found = normaliseOrders(res.pedidos||[]);
      }
      if (found.length) {
        setOrders(found); setUiState('results');
        showToast(`${found.length} pedido(s) encontrado(s)`,'success');
      } else {
        setUiState('no-results'); showToast('Nenhum pedido encontrado','info');
      }
    } catch(err) {
      setUiState('no-results'); showToast(err.message||'Erro ao buscar pedidos','error');
    }
  },[input,showToast]);

  const clear = () => { setInput(''); setUiState('empty'); setOrders([]); };

  return (
    <>
      <Header backHref="/" backLabel="← Voltar" showSearch={false} showCart={false}/>

      <section className={styles.hero}>
        <PackageSearchIcon size={80} color="white"/>
        <p>Acompanhe o status dos seus pedidos</p>
      </section>

      <div className={styles.searchFloat}>
        <div className={styles.searchCard}>
          <div className={styles.searchIconWrap}>
            <SearchIcon size={32} className={styles.searchIconSvg}/>
          </div>
          <div>
            <h3>Busque aqui suas compras</h3>
            <p>Digite seu CPF ou número da VD</p>
          </div>
        </div>
        <div className={styles.searchForm}>
          <div className={styles.inputGroup}>
            <input className={styles.searchInput} type="text"
              placeholder="CPF (000.000.000-00) ou VD (VD-001)"
              maxLength={18} value={input} onChange={handleInput}
              onKeyDown={e=>{ if(e.key==='Enter') search(); }}/>
            <button className={styles.btnSearch} onClick={search}>
              <SearchIcon size={18}/>
              Buscar
            </button>
          </div>
          <button className={styles.btnClear} onClick={clear}>Limpar</button>
        </div>
      </div>

      <section className={styles.results}>
        {uiState === 'empty' && (
          <div className={styles.emptyState}>
            <PackageSearchIcon size={120} color="var(--border-strong)"/>
            <h3>Nenhuma busca realizada</h3>
            <p>Digite seu CPF ou número da VD para visualizar suas compras</p>
          </div>
        )}
        {uiState === 'loading' && (
          <div className="loading-center"><div className="spinner"/><p>Buscando suas compras…</p></div>
        )}
        {uiState === 'no-results' && (
          <div className={styles.emptyState}>
            <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <h3>Nenhuma compra encontrada</h3>
            <p>Não encontramos pedidos associados a este CPF ou VD</p>
            <button className={`btn btn-primary ${styles.retryBtn}`} onClick={clear}>Tentar novamente</button>
          </div>
        )}
        {uiState === 'results' && (
          <div className={styles.grid}>
            {orders.map((order,i)=><OrderCard key={i} order={order}/>)}
          </div>
        )}
      </section>

      <Footer/>
    </>
  );
}

function OrderCard({ order }) {
  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.orderNum}>{order.vdNumber||'—'}</span>
        <span className={`${styles.status} ${STATUS_CLS[order.status]||styles.statusPending}`}>
          {order.statusText||'Pendente'}
        </span>
      </div>

      <div className={styles.products}>
        <h4><PackageIcon size={16}/> Produtos</h4>
        {order.products.map((p,i)=>(
          <div key={i} className={styles.productItem}>
            <span className={styles.productName}>{p.name}</span>
            <span className={styles.productQty}>×{p.qty}</span>
          </div>
        ))}
      </div>

      <div className={styles.orderTotal}>
        <span>Total</span>
        <span>R$ {order.total.toFixed(2)}</span>
      </div>

      <div className={styles.timeline}>
        <h4><MapPinIcon size={16}/> Status da entrega</h4>
        {order.timeline.map((step,i)=>(
          <div key={i} className={`${styles.timelineStep} ${step.active?styles.timelineActive:''}`}>
            <div className={styles.dot}/>
            <span className={styles.timelineTitle}>{step.step}</span>
          </div>
        ))}
      </div>
    </article>
  );
}