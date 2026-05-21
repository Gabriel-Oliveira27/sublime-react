'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchProducts } from '@/lib/api';
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

function applyFiltersToGroups(groups, filters) {
  return groups.filter(g => {
    const okLinha  = !filters.linha  || g.linha?.toLowerCase().includes(filters.linha.toLowerCase());
    const okLitros = !filters.litros || g.litros?.toString().toLowerCase().includes(filters.litros.toLowerCase());
    const term     = filters.search?.toLowerCase();
    const okSearch = !term ||
      g.descricao?.toLowerCase().includes(term) ||
      g.variations.some(v =>
        v.cores?.toLowerCase().includes(term) ||
        v.filtros?.toLowerCase().includes(term)
      );
    const okMin = !filters.priceMin || g.minPrice >= parseFloat(filters.priceMin);
    const okMax = !filters.priceMax || g.maxPrice <= parseFloat(filters.priceMax);
    return okLinha && okLitros && okSearch && okMin && okMax;
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
  const { sidebarOpen, closeSidebar }   = useCart();
  const { showToast }                   = useToast();
  const headerSearchRef                 = useRef(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const all   = await fetchProducts();
      const stock = all.filter(p => Number(p.qtd) > 0);
      setAllProducts(stock);
      const g = groupProducts(stock);
      setGrouped(g);
      setFiltered(g);
      showToast('Produtos carregados!', 'success');
    } catch (err) {
      setError(err.message);
      showToast('Erro ao carregar produtos.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFilters = useCallback((filters) => {
    setFiltered(applyFiltersToGroups(grouped, filters));
  }, [grouped]);

  // Sync header search input with filter
  useEffect(() => {
    const el = document.getElementById('header-search');
    if (!el) return;
    const handler = () => handleFilters({ search: el.value, linha: '', litros: '' });
    el.addEventListener('input', handler);
    return () => el.removeEventListener('input', handler);
  }, [handleFilters]);

  const validGroups = filtered.filter(g =>
    g.variations.some(v => {
      const p = parseFloat(v.valor);
      return !isNaN(p) && p >= 0.01;
    })
  );

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
            <div className={styles.grid}>
              {validGroups.map((group, i) => (
                <ProductCard
                  key={`${group.descricao}-${i}`}
                  group={group}
                  onOpenVariations={setModalGroup}
                />
              ))}
            </div>
          )}
        </div>

        {/* Filter sidebar — irmão direto de productsArea para sticky funcionar */}
        <FilterSidebar products={allProducts} onFiltersChange={handleFilters} />
      </div>

      {modalGroup && (
        <VariationsModal group={modalGroup} onClose={() => setModalGroup(null)} />
      )}

      <Footer />
    </>
  );
}