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

  const items = [
    { Icon: WhatsAppIcon, titulo: 'Peça pelo WhatsApp',  sub: 'Atendimento direto com a gente', action: openWhatsApp },
    { Icon: PackageIcon,  titulo: 'Rastreie seu pedido', sub: 'Pelo número VD ou CPF',           action: () => go('/compras') },
    { Icon: InfoIcon,     titulo: 'Sobre nossa loja',    sub: 'Quem somos e como funciona',      action: () => go('/sobre') },
    { Icon: StoreIcon,    titulo: 'Contratar plano',     sub: 'Tenha uma loja como esta',        action: () => go('/contrate') },
    // Só aparece quando o navegador oferece a instalação (não instalado ainda)
    ...(canInstall ? [{
      Icon: DownloadIcon, titulo: 'Instalar App', sub: 'Acesso rápido na tela inicial',
      action: async () => { await install(); onClose(); },
    }] : []),
  ];

  return (
    <nav className={`${styles.menu} ${open ? styles.open : ''}`} aria-label="Menu lateral">

      <div className={styles.brand}>Sublime</div>

      {/* Botão fechar */}
      <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar menu">
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="4" y1="4" x2="20" y2="20"/>
          <line x1="20" y1="4" x2="4" y2="20"/>
        </svg>
      </button>

      <div className={styles.items}>
        {items.map(({ Icon, titulo, sub, action }) => (
          <button key={titulo} className={styles.item} onClick={action}>
            <span className={styles.itemIcon}><Icon size={20}/></span>
            <span className={styles.itemText}>
              <strong>{titulo}</strong>
              <small>{sub}</small>
            </span>
            <svg className={styles.itemChevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        ))}
      </div>
    </nav>
  );
}
