'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchProducts } from '@/lib/api';
import { applyDiscount } from '@/lib/utils';
import { useConfig } from '@/context/ConfigContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SideMenu from '@/components/layout/SideMenu';
import Carousel from '@/components/store/Carousel';
import ProductCard from '@/components/store/ProductCard';
import FilterSidebar from '@/components/store/FilterSidebar';
import VariationsModal from '@/components/store/VariationsModal';
import CartSidebar from '@/components/cart/CartSidebar';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import styles from './page.module.css';

// Quantos cards renderizar por "página". A grade começa com PAGE_SIZE e o
// botão "Carregar mais" libera o restante em lotes — evita montar 100+ cards
// (e disparar 100+ requisições de imagem) de uma vez no primeiro paint.
const PAGE_SIZE = 20;

function groupProducts(products) {
  const map = {};
  products.forEach(p => {
    const key = `${p.descricao}||${(p.Litros || '').toString().trim()}`;
    if (!map[key]) {
      map[key] = {
        descricao:   p.descricao,
        linha:       p.linha,
        litros:      p.Litros,
        variations:  [],
        minPrice:    Infinity,
        maxPrice:    -Infinity,
        totalStock:  0,
      };
    }
    const g = map[key];
    g.variations.push(p);
    g.totalStock += Number(p.qtd);
    const v = parseFloat(p.valor);
    if (v < g.minPrice) g.minPrice = v;
    if (v > g.maxPrice) g.maxPrice = v;
  });
  return Object.values(map);
}

// Normaliza string: minúsculas + sem acentos
function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function applyFiltersToGroups(groups, filters, descontos) {
  const descGlobal = descontos?.global ?? 0;
  const descLinhas = descontos?.linhas ?? {};
  const term       = norm(filters.search).trim();
  const min        = parseFloat(filters.priceMin);
  const max        = parseFloat(filters.priceMax);
  const temMin     = !isNaN(min);
  const temMax     = !isNaN(max);

  return groups.filter(g => {
    // Linha e capacidade vêm de selects com valores exatos do banco —
    // igualdade estrita. Substring casava "1L" com "11L" e afins.
    const okLinha  = !filters.linha  ||
      norm(g.linha) === norm(filters.linha) ||
      g.variations.some(v => norm(v.linha) === norm(filters.linha));
    const okLitros = !filters.litros || norm(g.litros) === norm(filters.litros);

    const okSearch = !term ||
      norm(g.descricao).includes(term) ||
      norm(g.litros).includes(term) ||
      g.variations.some(v =>
        norm(v.cores).includes(term)   ||
        norm(v.filtros).includes(term) ||
        norm(v.linha).includes(term)
      );

    // Preço: o grupo entra se ALGUMA variação cair na faixa, usando o preço
    // COM desconto (o mesmo que o card exibe). Antes o grupo inteiro sumia
    // quando só parte das variações estava na faixa, e o desconto era ignorado.
    const okPreco = (!temMin && !temMax) || g.variations.some(v => {
      const pct   = descLinhas[g.linha] > 0 ? descLinhas[g.linha] : descGlobal;
      const preco = applyDiscount(v.valor, pct).finalPrice;
      return preco > 0 && (!temMin || preco >= min) && (!temMax || preco <= max);
    });

    return okLinha && okLitros && okSearch && okPreco;
  });
}

export default function StorePage() {
  const [allProducts, setAllProducts]   = useState([]);
  const [grouped,     setGrouped]       = useState([]);
  const [filtered,    setFiltered]      = useState([]);
  const [loading,     setLoading]       = useState(true);
  const [error,       setError]         = useState(null);
  const [menuOpen,    setMenuOpen]      = useState(false);
  const [modalGroup,  setModalGroup]    = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadClicks,   setLoadClicks]   = useState(0);
  const [showTopBtn,   setShowTopBtn]   = useState(false);
  const { sidebarOpen, closeSidebar }   = useCart();
  const { showToast }                   = useToast();
  const { descontoGlobal, descontoLinhas } = useConfig();
  // Guarda os últimos filtros aplicados para que a busca do header e a barra
  // lateral não descartem os filtros um do outro.
  const lastFiltersRef                  = useRef({ linha: '', litros: '', search: '', priceMin: '', priceMax: '' });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const all   = await fetchProducts();
      const stock = all.filter(p => Number(p.qtd) > 0);
      setAllProducts(stock);
      const g = groupProducts(stock);
      setGrouped(g);
      setFiltered(g);
      setVisibleCount(PAGE_SIZE);
      setLoadClicks(0);
    } catch (err) {
      setError(err.message);
      showToast('Erro ao carregar produtos.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Botão "voltar ao topo" — aparece depois de rolar a altura de uma tela.
  useEffect(() => {
    const onScroll = () => setShowTopBtn(window.scrollY > window.innerHeight);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleFilters = useCallback((filters) => {
    lastFiltersRef.current = { ...lastFiltersRef.current, ...filters };
    setFiltered(applyFiltersToGroups(grouped, lastFiltersRef.current, {
      global: descontoGlobal,
      linhas: descontoLinhas,
    }));
    // Filtro novo = resultado novo — volta para a primeira "página" para o
    // usuário não cair no meio de uma lista antiga.
    setVisibleCount(PAGE_SIZE);
    setLoadClicks(0);
  }, [grouped, descontoGlobal, descontoLinhas]);

  // Busca do header: mescla só o termo, preservando linha/capacidade/preço.
  useEffect(() => {
    const el = document.getElementById('header-search');
    if (!el) return;
    const handler = () => handleFilters({ search: el.value });
    el.addEventListener('input', handler);
    return () => el.removeEventListener('input', handler);
  }, [handleFilters]);

  const validGroups = filtered.filter(g =>
    g.variations.some(v => {
      const p = parseFloat(v.valor);
      return !isNaN(p) && p >= 0.01;
    })
  );

  const visibleGroups = validGroups.slice(0, visibleCount);
  const remaining     = validGroups.length - visibleGroups.length;

  const closeAll = () => { setMenuOpen(false); closeSidebar(); };

  return (
    <>
      <Header onMenuToggle={() => setMenuOpen(o => !o)} />

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <CartSidebar />

      {(menuOpen || sidebarOpen) && (
        <div className="overlay active" onClick={closeAll} />
      )}

      <Carousel />

      <div className={styles.layout}>
        {/* Products area (left) */}
        <div className={styles.productsArea}>
          <div className={styles.productsHeader}>
            <h2>Produtos</h2>
            <span className={styles.count}>
              {loading ? 'Carregando…' : `${validGroups.length} produto${validGroups.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {loading && (
            <div className="loading-center">
              <div className="spinner"/>
              <p>Carregando produtos…</p>
            </div>
          )}

          {!loading && error && (
            <div className={styles.errorState}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity:.7}}>
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <p>{error}</p>
              <button className="btn btn-primary" onClick={load} style={{ marginTop: '1rem' }}>
                Tentar Novamente
              </button>
            </div>
          )}

          {!loading && !error && validGroups.length === 0 && (
            <div className={styles.emptyState}>
              <p>Nenhum produto encontrado.</p>
            </div>
          )}

          {!loading && !error && validGroups.length > 0 && (
            <>
              <div className={styles.grid}>
                {visibleGroups.map((group, i) => (
                  <ProductCard
                    key={`${group.descricao}-${i}`}
                    group={group}
                    onOpenVariations={setModalGroup}
                  />
                ))}
              </div>

              {remaining > 0 && (
                <div className={styles.loadMoreWrap}>
                  <span className={styles.loadMoreInfo}>
                    Mostrando {visibleGroups.length} de {validGroups.length} produtos
                  </span>

                  {loadClicks < 1 ? (
                    <button
                      className={styles.loadMoreBtn}
                      onClick={() => { setVisibleCount(c => c + PAGE_SIZE); setLoadClicks(c => c + 1); }}
                    >
                      Carregar mais produtos
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                  ) : (
                    /* A partir do 2º clique, pergunta se quer tudo de uma vez */
                    <>
                      <span className={styles.loadAllAsk}>Carregar todos?</span>
                      <div className={styles.loadMoreChoices}>
                        <button
                          className={styles.loadAllBtn}
                          onClick={() => setVisibleCount(validGroups.length)}
                        >
                          Sim, ver todos ({validGroups.length})
                        </button>
                        <button
                          className={styles.loadMoreBtn}
                          onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                        >
                          Só mais {Math.min(PAGE_SIZE, remaining)}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Filter sidebar — irmão direto de productsArea para sticky funcionar */}
        <FilterSidebar products={allProducts} onFiltersChange={handleFilters} />
      </div>

      {modalGroup  && (
        <VariationsModal    group={modalGroup}  onClose={() => setModalGroup(null)} />
      )}

      <button
        className={`${styles.topBtn} ${showTopBtn ? styles.topBtnVisible : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Voltar ao topo"
        tabIndex={showTopBtn ? 0 : -1}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </button>

      <Footer />
    </>
  );
}