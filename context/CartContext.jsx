'use client';
import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { CONFIG } from '@/lib/config';
import { applyDiscount } from '@/lib/utils';

const CartContext = createContext(null);

function cartReducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return { ...state, items: action.items };
    case 'ADD': {
      const id = String(action.product.id);
      const calc = applyDiscount(action.product.valor, action.discountPct ?? 0);
      const finalPrice = calc.hasDiscount ? calc.finalPrice : parseFloat(action.product.valor);
      const existing = state.items.find(i => i.id === id);
      if (existing) {
        if (existing.quantity >= action.product.qtd) return { ...state, error: 'Estoque insuficiente' };
        return {
          ...state,
          items: state.items.map(i => i.id === id ? { ...i, quantity: i.quantity + 1 } : i),
        };
      }
      return {
        ...state,
        items: [...state.items, {
          id,
          descricao:     action.product.descricao,
          cores:         action.product.cores  || null,
          imagem:        action.product.imagem || null,
          qtd:           action.product.qtd,
          valor:         finalPrice,
          valorOriginal: parseFloat(action.product.valor),
          quantity:      1,
        }],
      };
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter(i => i.id !== String(action.id)) };
    case 'UPDATE_QTY': {
      const item = state.items.find(i => i.id === String(action.id));
      if (!item) return state;
      const next = item.quantity + Number(action.delta);
      if (next <= 0) return { ...state, items: state.items.filter(i => i.id !== String(action.id)) };
      if (next > item.qtd) return { ...state, error: 'Estoque insuficiente' };
      return { ...state, items: state.items.map(i => i.id === String(action.id) ? { ...i, quantity: next } : i) };
    }
    case 'CLEAR':
      return { ...state, items: [] };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'CLOSE_SIDEBAR':
      return { ...state, sidebarOpen: false };
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], sidebarOpen: false, error: null });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONFIG.STORE.CART_KEY);
      if (raw) {
        const items = JSON.parse(raw).map(i => ({ ...i, id: String(i.id) }));
        dispatch({ type: 'LOAD', items });
      }
    } catch (e) {
      console.error('[cart] load error:', e);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(CONFIG.STORE.CART_KEY, JSON.stringify(state.items));
    } catch (e) {
      console.error('[cart] save error:', e);
    }
  }, [state.items]);

  const totalItems  = state.items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice  = state.items.reduce((s, i) => s + parseFloat(i.valor) * i.quantity, 0);
  const isEmpty     = state.items.length === 0;

  const add = useCallback((product, discountPct = 0) => {
    // Verifica estoque antes de despachar para que o chamador saiba se
    // conseguiu adicionar (o dispatch não retorna estado).
    const id         = String(product.id);
    const existing   = state.items.find(i => i.id === id);
    const currentQty = existing ? existing.quantity : 0;
    if (currentQty >= Number(product.qtd)) return false; // estoque esgotado
    dispatch({ type: 'ADD', product, discountPct });
    return true;
  }, [state.items]);
  const remove = useCallback((id) => dispatch({ type: 'REMOVE', id }), []);
  const updateQty = useCallback((id, delta) => dispatch({ type: 'UPDATE_QTY', id, delta }), []);
  const clear = useCallback(() => {
    localStorage.removeItem(CONFIG.STORE.CART_KEY);
    dispatch({ type: 'CLEAR' });
  }, []);
  const toggleSidebar = useCallback(() => dispatch({ type: 'TOGGLE_SIDEBAR' }), []);
  const closeSidebar = useCallback(() => dispatch({ type: 'CLOSE_SIDEBAR' }), []);

  return (
    <CartContext.Provider value={{
      items: state.items,
      sidebarOpen: state.sidebarOpen,
      totalItems,
      totalPrice,
      isEmpty,
      add,
      remove,
      updateQty,
      clear,
      toggleSidebar,
      closeSidebar,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}