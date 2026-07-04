// components/store/ProductDescription.jsx
'use client';
import { useState, useRef, useEffect } from 'react';
import styles from './ProductDescription.module.css';

function renderMarkdown(md) {
  if (!md) return '';
  return md
    // Escapa TODOS os metacaracteres de HTML antes de qualquer transformação —
    // inclusive aspas. Sem escapar " e ', um link markdown com aspas na URL
    // (ex.: [x](https://a" onmouseover="alert(1)) permitia injeção de atributo
    // (XSS armazenado) no <a href="...">. As aspas que usamos nas tags geradas
    // são adicionadas DEPOIS deste passo, então continuam válidas.
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm,  '<h3>$1</h3>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>')
    .replace(/_([^_\n]+?)_/g, '<em>$1</em>')
    .replace(/`([^`]+?)`/g,  '<code>$1</code>')
    .replace(/\[([^\]]+?)\]\((https?:\/\/[^)]+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .split(/\n{2,}/)
    .map(b => /^<(h[234]|ul|li)/.test(b.trim()) ? b : `<p>${b.replace(/\n/g, '<br/>')}</p>`)
    .join('\n');
}

export default function ProductDescription({ detalhes }) {
  const [open, setOpen] = useState(true);
  const ref = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    setHeight(open && ref.current ? ref.current.scrollHeight : 0);
  }, [open]);

  if (!detalhes?.trim()) return null;

  return (
    <div className={styles.wrap}>
      <button className={styles.toggle} onClick={() => setOpen(o => !o)}
        aria-expanded={open} type="button">
        <span className={styles.label}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Informações do produto
        </span>
        <svg className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <div className={styles.body} style={{ maxHeight: open ? height || 'none' : 0 }} aria-hidden={!open}>
        <div ref={ref} className={styles.content}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(detalhes) }} />
      </div>
    </div>
  );
}
