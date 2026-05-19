'use client';
import { useRouter } from 'next/navigation';
import { CONFIG } from '@/lib/config';
import { WhatsAppIcon, PackageIcon } from '@/components/icons/Icons';
import styles from './SideMenu.module.css';

export default function SideMenu({ open, onClose }) {
  const router = useRouter();
  const go = (path) => { onClose(); router.push(path); };
  const openWhatsApp = () => {
    const msg = encodeURIComponent('Olá! Gostaria de mais informações sobre os produtos Sublime.');
    window.open(`https://wa.me/${CONFIG.API.WHATSAPP_NUMBER}?text=${msg}`, '_blank');
    onClose();
  };

  return (
    <nav className={`${styles.menu} ${open ? styles.open : ''}`} aria-label="Menu lateral">
      <div className={styles.item} onClick={openWhatsApp}>
        <WhatsAppIcon size={22}/>
        <span>WhatsApp</span>
      </div>
      <div className={styles.item} onClick={() => go('/compras')}>
        <PackageIcon size={22}/>
        <span>Rastrear pedido</span>
      </div>
    </nav>
  );
}
