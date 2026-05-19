'use client';
import { useState, useEffect } from 'react';
import styles from './FilterSidebar.module.css';

export default function FilterSidebar({ products, onFiltersChange }) {
  const [filters, setFilters] = useState({ linha: '', litros: '', search: '', priceMin: '', priceMax: '' });
  const [linhas, setLinhas] = useState([]);
  const [litrosList, setLitrosList] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setLinhas([...new Set(products.map(p => p.linha).filter(Boolean))]);
    setLitrosList([...new Set(products.map(p => p.Litros).filter(Boolean))]);
  }, [products]);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const set = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));
  const clear = () => setFilters({ linha: '', litros: '', search: '', priceMin: '', priceMax: '' });

  const sidebar = (
    <div className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <span>Filtros</span>
        <button className={styles.clearBtn} onClick={clear}>Limpar tudo</button>
      </div>

      <div className={styles.block}>
        <label className={styles.label}>Linha</label>
        <select className="form-select" value={filters.linha} onChange={e => set('linha', e.target.value)}>
          <option value="">Todas as linhas</option>
          {linhas.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div className={styles.block}>
        <label className={styles.label}>Capacidade</label>
        <select className="form-select" value={filters.litros} onChange={e => set('litros', e.target.value)}>
          <option value="">Todas</option>
          {litrosList.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div className={styles.block}>
        <label className={styles.label}>Buscar produto</label>
        <input
          type="text"
          className="form-input"
          placeholder="Nome, cor, linha…"
          value={filters.search}
          onChange={e => set('search', e.target.value)}
        />
      </div>

      <div className={styles.block}>
        <label className={styles.label}>Faixa de preço (R$)</label>
        <div className={styles.priceRow}>
          <input
            type="number"
            className="form-input"
            placeholder="Mín"
            min="0"
            value={filters.priceMin}
            onChange={e => set('priceMin', e.target.value)}
            style={{ textAlign: 'center' }}
          />
          <input
            type="number"
            className="form-input"
            placeholder="Máx"
            min="0"
            value={filters.priceMax}
            onChange={e => set('priceMax', e.target.value)}
            style={{ textAlign: 'center' }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className={`${styles.mobileToggle} ${mobileOpen ? styles.active : ''}`}
        onClick={() => setMobileOpen(o => !o)}
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="9" y1="18" x2="15" y2="18"/>
        </svg>
        Filtros
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 'auto', transition: 'transform .25s', transform: mobileOpen ? 'rotate(180deg)' : 'none' }}>
          <path d="m6 9 4 4 4-4"/>
        </svg>
      </button>
      {mobileOpen && <div className={styles.mobileSidebar}>{sidebar}</div>}
      <div className={styles.desktopSidebar}>{sidebar}</div>
    </>
  );
}
