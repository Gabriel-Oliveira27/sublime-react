'use client';
// Página institucional "Sobre" da loja.
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import {
  PackageIcon, MapPinIcon, TruckIcon, PixIcon, SearchIcon,
  WhatsAppIcon, CheckCircleIcon, SparklesIcon, ShoppingCartIcon,
} from '@/components/icons/Icons';
import { CONFIG } from '@/lib/config';
import styles from './page.module.css';

export default function SobreContent() {
  const [whatsapp, setWhatsapp] = useState(CONFIG.API.WHATSAPP_NUMBER);

  useEffect(() => {
    fetch('/api/config/public')
      .then(r => r.json())
      .then(data => { if (data.whatsapp) setWhatsapp(String(data.whatsapp).replace(/\D/g, '')); })
      .catch(() => { /* mantém o número padrão */ });
  }, []);

  const waLink = `https://wa.me/${whatsapp}?text=${encodeURIComponent('Olá! Vim pela página Sobre da loja e gostaria de mais informações.')}`;

  return (
    <>
      <Header backHref="/" backLabel="← Loja" showSearch={false} showCart={false} />

      <main className={styles.page}>

        {/* ── Hero ── */}
        <section className={styles.hero}>
          <span className={styles.badge}>
            <SparklesIcon size={15} />
            Nossa história
          </span>
          <h1>Sobre a Sublime</h1>
          <p>
            A Sublime oferece produtos Tupperware de alta qualidade para facilitar o
            seu dia a dia — com atendimento próximo, entrega local e uma experiência
            de compra simples do início ao fim.
          </p>
        </section>

        {/* ── Quem somos ── */}
        <section className={styles.section}>
          <div className={styles.cols}>
            <div className={styles.colText}>
              <h2>Quem somos</h2>
              <p>
                Somos uma loja dedicada à linha Tupperware: potes, garrafas e soluções
                de armazenamento e preparo que duram anos e organizam a cozinha de
                verdade. Trabalhamos com estoque próprio e catálogo sempre atualizado —
                o que você vê na loja é o que temos disponível agora.
              </p>
              <p>
                Atendemos Iguatu-CE e região a partir do bairro Veneza, com retirada
                agendada ou entrega na sua casa. Cada pedido recebe um número de
                acompanhamento (VD) para você seguir tudo em tempo real, da reserva
                à entrega.
              </p>
            </div>
            <ul className={styles.pillars}>
              {[
                'Produtos originais Tupperware',
                'Estoque real: sem surpresa depois da compra',
                'Atendimento humano pelo WhatsApp',
                'Pagamento em PIX, dinheiro ou cartão',
              ].map(item => (
                <li key={item}>
                  <CheckCircleIcon size={18} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Como funciona ── */}
        <section className={styles.sectionAlt}>
          <h2 className={styles.centerTitle}>Como sua compra funciona</h2>
          <div className={styles.grid}>
            {[
              { Icon: ShoppingCartIcon, t: 'Escolha e reserve',   s: 'Adicione os produtos ao carrinho e finalize pelo site ou pelo WhatsApp.' },
              { Icon: PixIcon,          t: 'Pague como preferir', s: 'PIX na hora com confirmação automática, dinheiro ou cartão de crédito.' },
              { Icon: TruckIcon,        t: 'Receba ou retire',    s: 'Entrega na sua casa ou retirada agendada no dia e horário que preferir.' },
              { Icon: SearchIcon,       t: 'Acompanhe tudo',      s: 'Rastreie seu pedido pelo número VD ou CPF, do preparo à entrega.' },
            ].map(({ Icon, t, s }) => (
              <div key={t} className={styles.card}>
                <div className={styles.cardIcon}><Icon size={22} /></div>
                <h3>{t}</h3>
                <p>{s}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Onde estamos / contato ── */}
        <section className={styles.section}>
          <div className={styles.contactBox}>
            <div className={styles.contactInfo}>
              <h2>Onde estamos</h2>
              <p className={styles.address}>
                <MapPinIcon size={18} />
                {CONFIG.ORIGIN.DISPLAY} — {CONFIG.ORIGIN.CITY}/{CONFIG.ORIGIN.STATE}
              </p>
              <p className={styles.addressNote}>
                Retiradas mediante agendamento feito no checkout.
              </p>
            </div>
            <div className={styles.contactActions}>
              <a href={waLink} target="_blank" rel="noreferrer" className="btn btn-primary">
                <WhatsAppIcon size={18} />
                Falar no WhatsApp
              </a>
              <Link href="/compras" className="btn btn-secondary">
                <PackageIcon size={18} />
                Rastrear pedido
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}
