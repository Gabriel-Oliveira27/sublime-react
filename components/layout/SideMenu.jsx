'use client';
import { useRouter } from 'next/navigation';
import { CONFIG } from '@/lib/config';
import { useInstallPrompt } from '@/components/pwa/useInstallPrompt';
import { WhatsAppIcon, PackageIcon, DownloadIcon, InfoIcon, StoreIcon } from '@/components/icons/Icons';
import styles from './SideMenu.module.css';

export default function SideMenu({ open, onClose }) {
  const router = useRouter();
  const { canInstall, install } = useInstallPrompt();
  const go = (path) => { onClose(); router.push(path); };
  const openWhatsApp = () => {
    const msg = encodeURIComponent('Olá! Gostaria de mais informações sobre os produtos Sublime.');
    window.open(`https://wa.me/${CONFIG.API.WHATSAPP_NUMBER}?text=${msg}`, '_blank');
    onClose();
  };

  return (
    <nav className={`${styles.menu} ${open ? styles.open : ''}`} aria-label="Menu lateral">

      {/* Botão fechar */}
      <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar menu">
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="4" y1="4" x2="20" y2="20"/>
          <line x1="20" y1="4" x2="4" y2="20"/>
        </svg>
      </button>

      <div className={styles.item} onClick={openWhatsApp}>
        <WhatsAppIcon size={22}/>
        <span>WhatsApp</span>
      </div>
      <div className={styles.item} onClick={() => go('/compras')}>
        <PackageIcon size={22}/>
        <span>Rastrear pedido</span>
      </div>
      <div className={styles.item} onClick={() => go('/sobre')}>
        <InfoIcon size={22}/>
        <span>Sobre a loja</span>
      </div>
      <div className={styles.item} onClick={() => go('/contrate')}>
        <StoreIcon size={22}/>
        <span>Contrate: loja como esta</span>
      </div>
      {/* Só aparece quando o navegador oferece a instalação (não instalado ainda) */}
      {canInstall && (
        <div className={styles.item} onClick={async () => { await install(); onClose(); }}>
          <DownloadIcon size={22}/>
          <span>Instalar App</span>
        </div>
      )}
    </nav>
  );
}