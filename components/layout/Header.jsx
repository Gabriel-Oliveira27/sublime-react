'use client';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import styles from './Header.module.css';

export default function Header({
  onMenuToggle,
  showSearch = true,
  showCart   = true,
  backHref,
  backLabel,
  onBackClick,   // quando fornecido, substitui a navegação do botão "voltar"
}) {
  const { totalItems, toggleSidebar } = useCart();

  const backButton = onBackClick ? (
    <button className={styles.backBtn} onClick={onBackClick}>
      {backLabel || '← Voltar'}
    </button>
  ) : backHref ? (
    <Link href={backHref} className={styles.backBtn}>
      {backLabel || '← Voltar'}
    </Link>
  ) : null;

  return (
    <header className={styles.header}>
      <div className={styles.content}>
        {onMenuToggle ? (
          <button className={styles.iconBtn} onClick={onMenuToggle} aria-label="Menu">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 10h18M3 5h18M3 15h18"/>
            </svg>
          </button>
        ) : backButton}

        <Link href="/" className={styles.logo}>Sublime</Link>

        {showSearch && (
          <div className={styles.searchWrap}>
            <input
              type="text"
              placeholder="Buscar produtos…"
              aria-label="Buscar produtos"
              className={styles.searchInput}
              id="header-search"
            />
          </div>
        )}

        {showCart && (
          <div className={styles.actions}>
            <button className={styles.iconBtn} onClick={toggleSidebar} aria-label="Carrinho">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              {totalItems > 0 && <span className={styles.badge}>{totalItems}</span>}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}