'use client';
import { useEffect, useRef } from 'react';
import { useCart } from '@/context/CartContext';
import { registrarSW, pushSuportado, pingCarrinho, agendarLembreteLocal } from '@/lib/pushClient';

/**
 * Liga o PWA da loja:
 *  - registra o service worker (instalação + recepção de push);
 *  - observa o carrinho e alimenta o lembrete de abandono (ping no servidor +
 *    timer local no SW), apenas quando o visitante já permitiu notificações.
 * Não renderiza nada.
 */
export default function PwaProvider() {
  const { totalItems } = useCart();
  const debounceRef = useRef(null);
  const lastQtdRef  = useRef(null);

  // Registra o SW uma vez
  useEffect(() => { registrarSW(); }, []);

  // Carrinho → ping no servidor + lembrete local (debounce de 4s para
  // agrupar cliques seguidos de "adicionar")
  useEffect(() => {
    if (!pushSuportado() || Notification.permission !== 'granted') return;
    if (lastQtdRef.current === totalItems) return;
    lastQtdRef.current = totalItems;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pingCarrinho(totalItems);
      agendarLembreteLocal(totalItems > 0);
    }, 4000);

    return () => clearTimeout(debounceRef.current);
  }, [totalItems]);

  return null;
}
