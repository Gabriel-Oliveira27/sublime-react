'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchProducts } from '@/lib/api';
import { applyDiscount, parseImages, groupSlug } from '@/lib/utils';
import { useConfig } from '@/context/ConfigContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartSidebar from '@/components/cart/CartSidebar';
import SideMenu from '@/components/layout/SideMenu';
import ProductDescription from '@/components/store/ProductDescription';
import PhotoLightbox from '@/components/store/PhotoLightbox';
import { AlertTriangleIcon } from '@/components/icons/Icons';
import styles from './page.module.css';

/* helpers */
function groupProducts(products) {
  const map = {};
  products.forEach(p => {
    const key = `${p.descricao}||${(p.Litros || '').toString().trim()}`;
    if (!map[key]) map[key] = { descricao: p.descricao, linha: p.linha, litros: p.Litros, variations: [], minPrice: Infinity, maxPrice: -Infinity, totalStock: 0 };
    const g = map[key];
    g.variations.push(p);
    g.totalStock += Number(p.qtd);
    const v = parseFloat(p.valor);
    if (v < g.minPrice) g.minPrice = v;
    if (v > g.maxPrice) g.maxPrice = v;
  });
  return Object.values(map);
}

function stripMd(s) {
  return String(s || '').replace(/(\*\*|__|_|\*|`|#{1,6} )/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
}

export default function ProductPage() {
  const { slug }            = useParams();
  const router              = useRouter();
  const { add, sidebarOpen, closeSidebar } = useCart();
  const { showToast }       = useToast();
  const { descontoGlobal, descontoLinhas } = useConfig();

  const [group,         setGroup]         = useState(null);
  const discountPct = useMemo(() => {
    if (group?.linha && descontoLinhas[group.linha] > 0) return descontoLinhas[group.linha];
    return descontoGlobal;
  }, [group?.linha, descontoLinhas, descontoGlobal]);
  const [loading,       setLoading]       = useState(true);
  const [notFound,      setNotFound]      = useState(false);
  const [selectedVar,   setSelectedVar]   = useState(null);
  const [activeImg,     setActiveImg]     = useState(0);
  const [showChars,     setShowChars]     = useState(false);
  const [lightbox,      setLightbox]      = useState(null); // { images, idx }
  const [menuOpen,      setMenuOpen]      = useState(false);

  const load = useCallback(async () => {
    try {
      const all  = await fetchProducts();
      const groups = groupProducts(all.filter(p => Number(p.qtd) > 0));
      const found  = groups.find(g => groupSlug(g) === slug);
      if (!found) { setNotFound(true); return; }
      setGroup(found);
      setSelectedVar(found.variations[0]);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  // Reset active image when variation changes
  useEffect(() => { setActiveImg(0); }, [selectedVar]);

  if (loading) return (
    <>
      <Header onMenuToggle={() => setMenuOpen(o => !o)} />
      <div className={styles.loadingCenter}>
        <div className="spinner" />
        <p>Carregando produto…</p>
      </div>
      <Footer />
    </>
  );

  if (notFound) return (
    <>
      <Header onMenuToggle={() => setMenuOpen(o => !o)} />
      <div className={styles.notFound}>
        <h2>Produto não encontrado</h2>
        <p>O produto que você está procurando não existe ou foi removido.</p>
        <Link href="/" className="btn btn-primary">Voltar à loja</Link>
      </div>
      <Footer />
    </>
  );

  const multi       = group.variations.length > 1;
  const images      = parseImages(selectedVar.imagem);
  const calc        = applyDiscount(selectedVar.valor);
  const rawDetails  = selectedVar.detalhes || group.variations[0]?.detalhes;
  const shortDesc   = rawDetails ? stripMd(rawDetails).slice(0, 100) : null;
  const hasMoreDesc = rawDetails && stripMd(rawDetails).length > 0;

  const handleAdd = () => {
    const result = add(selectedVar, discountPct);
    if (result !== false) showToast('Produto adicionado ao carrinho!', 'success');
    else showToast('Estoque insuficiente', 'error');
  };

  return (
    <>
      <Header onMenuToggle={() => setMenuOpen(o => !o)} />
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <CartSidebar />
      {(menuOpen || sidebarOpen) && <div className="overlay active" onClick={() => { setMenuOpen(false); closeSidebar(); }} />}

      <div className={styles.wrapper}>
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb} aria-label="Navegação">
          <Link href="/">Produtos</Link>
          <span>›</span>
          {group.linha && <><span>{group.linha}</span><span>›</span></>}
          <span className={styles.breadCurrent}>{group.descricao}</span>
        </nav>

        <div className={styles.layout}>
          {/* ── Coluna esquerda: galeria ── */}
          <div className={styles.gallery}>
            {/* Tira de thumbnails vertical */}
            {images.length > 1 && (
              <div className={styles.thumbStrip}>
                {images.map((url, i) => (
                  <button
                    key={i}
                    className={`${styles.thumb} ${i === activeImg ? styles.thumbActive : ''}`}
                    onClick={() => setActiveImg(i)}
                    aria-label={`Ver foto ${i + 1}`}
                  >
                    <img src={url} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}

            {/* Imagem principal */}
            <div
              className={styles.mainImgWrap}
              onClick={() => setLightbox({ images, idx: activeImg })}
              title="Clique para ampliar"
            >
              <img
                key={`${selectedVar?.id}-${activeImg}`}
                src={images[activeImg]}
                alt={group.descricao}
                className={styles.mainImg}
                loading="eager"
              />
              <span className={styles.zoomHint}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                </svg>
                Ampliar
              </span>
            </div>
          </div>

          {/* ── Coluna direita: informações ── */}
          <div className={styles.info}>
            {/* Tags */}
            {(group.linha || group.litros) && (
              <div className={styles.tags}>
                {group.linha  && <span className={styles.tag}>{group.linha}</span>}
                {group.litros && <span className={styles.tag}>{group.litros}</span>}
              </div>
            )}

            <h1 className={styles.name}>{group.descricao}</h1>

            {/* Descrição breve */}
            {shortDesc && <p className={styles.shortDesc}>{shortDesc}</p>}

            {/* Preço */}
            <div className={styles.priceBlock}>
              {calc.hasDiscount ? (
                <>
                  <span className={styles.priceOld}>R$ {calc.originalPrice.toFixed(2)}</span>
                  <div className={styles.priceRow}>
                    <span className={styles.price}>R$ {calc.finalPrice.toFixed(2)}</span>
                    <span className={styles.discBadge}>{calc.discount}% OFF</span>
                  </div>
                </>
              ) : (
                <span className={styles.price}>R$ {parseFloat(selectedVar.valor).toFixed(2)}</span>
              )}
              <span className={styles.stock} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {selectedVar.qtd > 5 ? (
                  `${selectedVar.qtd} em estoque`
                ) : selectedVar.qtd > 0 ? (
                  <><AlertTriangleIcon size={14} /> {selectedVar.qtd === 1 ? 'Última unidade' : `Últimas ${selectedVar.qtd} unidades`}</>
                ) : (
                  'Esgotado'
                )}
              </span>
            </div>

            {/* Seletor de variações (cores) */}
            {multi && (
              <div className={styles.variants}>
                <p className={styles.varLabel}>
                  Cor: <strong>{selectedVar.cores}</strong>
                </p>
                <div className={styles.varGrid}>
                  {group.variations.map((v, i) => {
                    const vImgs = parseImages(v.imagem);
                    return (
                      <button
                        key={i}
                        className={`${styles.varBtn} ${v.id === selectedVar.id ? styles.varBtnActive : ''}`}
                        onClick={() => setSelectedVar(v)}
                        title={v.cores}
                      >
                        <img src={vImgs[0]} alt={v.cores} />
                        <span>{v.cores}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Botão adicionar */}
            <div className={styles.ctaRow}>
              <button
                className={styles.addBtn}
                onClick={handleAdd}
                disabled={selectedVar.qtd === 0}
              >
                {selectedVar.qtd === 0 ? 'Produto Esgotado' : 'Adicionar ao Carrinho'}
              </button>
            </div>

            {/* "Ver características" expansível */}
            {hasMoreDesc && (
              <div className={styles.charsSection}>
                <button
                  className={styles.charsToggle}
                  onClick={() => setShowChars(o => !o)}
                >
                  {showChars ? 'Ocultar características' : 'Ver características'}
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: showChars ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {showChars && <ProductDescription detalhes={rawDetails} />}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <PhotoLightbox
          images={lightbox.images}
          startIdx={lightbox.idx}
          onClose={() => setLightbox(null)}
        />
      )}

      <Footer />
    </>
  );
}