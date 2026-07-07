'use client';
// Hook do prompt de instalação do PWA.
//
// O navegador dispara `beforeinstallprompt` UMA vez, muitas vezes antes de o
// React montar — por isso o evento é capturado no escopo do módulo (importado
// no boot via PwaProvider) e guardado até alguém chamar `install()`.
// Quando o app já está instalado (display-mode: standalone) nada é exibido.

import { useSyncExternalStore } from 'react';

let deferredPrompt = null;
const listeners = new Set();

function emitir() {
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // segura o mini-infobar do Chrome; mostramos nosso botão
    deferredPrompt = e;
    emitir();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emitir();
  });
}

function rodandoInstalado() {
  return typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
     window.navigator.standalone === true); // iOS Safari
}

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return !rodandoInstalado() && !!deferredPrompt;
}

export function useInstallPrompt() {
  // Store externo (evento do navegador) → useSyncExternalStore
  const canInstall = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const install = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      deferredPrompt = null;
      emitir();
    }
    return outcome === 'accepted';
  };

  return { canInstall, install };
}
