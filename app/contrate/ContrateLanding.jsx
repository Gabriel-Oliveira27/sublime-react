'use client';
// Landing "Contrate já" — apresentação do SaaS whitelabel de vendas.
// Conteúdo (planos, preços, prazos, taxas) vem do briefing oficial — não
// alterar números sem atualizar o documento fonte.
import { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import {
  ShoppingCartIcon, WhatsAppIcon, PixIcon, BarChartIcon, SearchIcon,
  PercentIcon, SmartphoneIcon, ClipboardListIcon, PaletteIcon, PackageIcon,
  TagIcon, CheckCircleIcon, SparklesIcon, StoreIcon,
} from '@/components/icons/Icons';
import { useToast } from '@/context/ToastContext';
import { applyPhoneMask } from '@/lib/utils';
import { CONFIG } from '@/lib/config';
import styles from './page.module.css';

// Número que recebe os pedidos de contratação. Pode ser sobrescrito por
// ambiente (útil quando a loja whitelabel não pertence ao dono da plataforma).
const CONTATO_WHATSAPP =
  process.env.NEXT_PUBLIC_CONTRATE_WHATSAPP || CONFIG.API.WHATSAPP_NUMBER;

/* ── Conteúdo (fonte: briefing) ─────────────────────────────── */

const PLANOS = [
  {
    nome: 'Essencial',
    deploy: 149,
    mensal: 59,
    prazo: '~15 dias',
    destaque: true,
    persona: 'Para quem quer colocar a loja no ar rápido, com o essencial pronto.',
    inclui: ['Nome, logo e cores da sua marca'],
  },
  {
    nome: 'Profissional',
    deploy: 279,
    mensal: 89,
    prazo: '~20 dias',
    destaque: false,
    persona: 'O equilíbrio ideal entre personalização e investimento.',
    inclui: ['Tudo do Essencial', 'Layout personalizado', 'Vitrine e categorias sob medida'],
  },
  {
    nome: 'Completo',
    deploy: 497,
    mensal: 129,
    prazo: '~30 dias',
    destaque: false,
    persona: 'Para operações maiores que precisam de módulos e ajustes amplos.',
    inclui: ['Tudo do Profissional', 'Customização ampla', 'Módulos adicionais'],
  },
];

const FUNCIONALIDADES = [
  { Icon: StoreIcon,         titulo: 'Loja pronta para vender',  texto: 'Vitrine, catálogo, carrinho e checkout completos desde o primeiro dia.' },
  { Icon: WhatsAppIcon,      titulo: 'Checkout flexível',        texto: 'Seu cliente finaliza a compra pelo site ou direto pelo WhatsApp.' },
  { Icon: PixIcon,           titulo: 'PIX integrado',            texto: 'Geração e confirmação automáticas de pagamento — 100% integrado.' },
  { Icon: BarChartIcon,      titulo: 'Dashboard completo',       texto: 'Estoque, pedidos, cupons, frete, descontos e relatórios num só lugar.' },
  { Icon: SearchIcon,        titulo: 'Rastreio de pedidos',      texto: 'Cliente acompanha a compra pelo número da venda (VD) ou CPF.' },
  { Icon: PercentIcon,       titulo: 'Descontos inteligentes',   texto: 'Promoção global, por linha de produtos ou em um único item.' },
  { Icon: SmartphoneIcon,    titulo: 'App Android + PWA',        texto: 'Loja instalável no celular, com notificações para você e seus clientes.' },
  { Icon: ClipboardListIcon, titulo: 'Relatórios',               texto: 'Visão clara de vendas e usuários para decidir com dados.' },
  { Icon: PaletteIcon,       titulo: 'Whitelabel de verdade',    texto: 'Tudo com a sua marca e no seu domínio. A loja é sua, não alugada.' },
];

const VALORES = [
  { titulo: 'Simplicidade',  texto: 'tecnologia que funciona sem complicar a vida do lojista.' },
  { titulo: 'Transparência', texto: 'preços claros, sem taxas escondidas — funções gratuitas, custo só quando se vende.' },
  { titulo: 'Autonomia',     texto: 'a loja é do cliente (whitelabel), não uma vitrine alugada.' },
  { titulo: 'Parceria',      texto: 'acompanhamos o cliente do deploy à operação.' },
  { titulo: 'Evolução',      texto: 'a plataforma cresce junto com o negócio.' },
];

const FAQ = [
  {
    q: 'Quanto tempo leva para a minha loja ficar no ar?',
    a: 'Depende do plano: cerca de 15 dias no Essencial, 20 dias no Profissional e 30 dias no Completo. O prazo cobre personalização, publicação e testes.',
  },
  {
    q: 'O que está incluído em todos os planos?',
    a: 'Loja online completa, dashboard do vendedor e aplicativo Android + PWA instalável. Tudo com a sua marca.',
  },
  {
    q: 'Quais custos ficam por fora?',
    a: 'Opcionais contratados à parte: domínio próprio (~R$ 40/ano), hospedagem/VPS (~R$ 39/mês) e módulos extras ou personalizações sob orçamento.',
  },
  {
    q: 'Pago alguma taxa por venda?',
    a: 'Apenas a taxa do meio de pagamento — PIX a partir de 0,99% (configurável); demais métodos conforme a operadora. As funções da plataforma não têm custo de licença: você só paga quando vende.',
  },
  {
    q: 'A loja é realmente minha?',
    a: 'Sim. O modelo é whitelabel: a loja roda com o seu nome, a sua logo, as suas cores e no seu domínio. Você tem autonomia total sobre produtos, preços e promoções.',
  },
  {
    q: 'Como funciona a cobrança?',
    a: 'Um valor único de implantação (deploy) para colocar a loja no ar + uma mensalidade de operação conforme o plano escolhido.',
  },
];

const SEGMENTOS = [
  'Moda e acessórios', 'Alimentos e bebidas', 'Cosméticos e beleza',
  'Utilidades para o lar', 'Eletrônicos', 'Papelaria e presentes',
  'Serviços', 'Outro',
];

/* ── Página ─────────────────────────────────────────────────── */

export default function ContrateLanding() {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    nome: '', whatsapp: '', email: '', segmento: '', plano: '', mensagem: '',
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const escolherPlano = (nome) => {
    setForm(f => ({ ...f, plano: nome }));
    document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' });
  };

  const enviar = (e) => {
    e.preventDefault();
    if (form.nome.trim().length < 2) { showToast('Digite seu nome', 'error'); return; }
    if (form.whatsapp.replace(/\D/g, '').length < 10) { showToast('Digite um WhatsApp válido', 'error'); return; }

    const linhas = [
      'Olá! Quero contratar a plataforma de loja online.',
      '',
      `Nome: ${form.nome.trim()}`,
      `WhatsApp: ${form.whatsapp.trim()}`,
      form.email.trim()    && `E-mail: ${form.email.trim()}`,
      form.segmento        && `Segmento: ${form.segmento}`,
      form.plano           && `Plano de interesse: ${form.plano}`,
      form.mensagem.trim() && `Mensagem: ${form.mensagem.trim()}`,
    ].filter(Boolean);

    window.open(
      `https://wa.me/${CONTATO_WHATSAPP}?text=${encodeURIComponent(linhas.join('\n'))}`,
      '_blank', 'noopener'
    );
  };

  return (
    <>
      <Header backHref="/" backLabel="Loja" showSearch={false} showCart={false} />

      <main className={styles.page}>

        {/* ── Hero ── */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <span className={styles.heroBadge}>
              <SparklesIcon size={15} />
              SaaS Whitelabel de Vendas
            </span>
            <h1>Sua loja online profissional, no ar em até 15 dias.</h1>
            <p>
              Colocar uma loja no ar costuma ser caro e complicado. Aqui você recebe
              uma loja completa — site, dashboard e aplicativo — com a sua marca e no
              seu domínio, por um valor único de implantação e uma mensalidade acessível.
            </p>
            <div className={styles.heroActions}>
              <a href="#planos" className="btn btn-primary">Contrate já</a>
              <a href="#funcionalidades" className={`btn btn-secondary ${styles.btnGhost}`}>
                Ver funcionalidades
              </a>
            </div>
          </div>
        </section>

        {/* ── Prova de valor ── */}
        <section className={styles.proof}>
          {[
            { Icon: PackageIcon, t: 'Tudo incluso',              s: 'Loja + dashboard + app Android e PWA' },
            { Icon: PixIcon,     t: 'PIX 100% integrado',        s: 'Cobrança gerada e confirmada na hora' },
            { Icon: PaletteIcon, t: 'Whitelabel',                s: 'Sua marca, suas cores, seu domínio' },
            { Icon: TagIcon,     t: 'Sem taxa por função',       s: 'Funções grátis; custo só quando você vende' },
          ].map(({ Icon, t, s }) => (
            <div key={t} className={styles.proofItem}>
              <Icon size={26} />
              <div>
                <strong>{t}</strong>
                <span>{s}</span>
              </div>
            </div>
          ))}
        </section>

        {/* ── Como funciona ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Como funciona</h2>
          <p className={styles.sectionSub}>Da contratação à primeira venda em três passos.</p>
          <div className={styles.steps}>
            {[
              { n: '1', t: 'Escolha o plano',            s: 'Você define o nível de personalização e fecha a contratação pelo WhatsApp.' },
              { n: '2', t: 'Personalizamos e publicamos', s: 'Aplicamos sua marca, configuramos pagamentos e colocamos a loja no ar no prazo do plano.' },
              { n: '3', t: 'Você vende',                  s: 'Loja, dashboard e app funcionando — você cadastra produtos e começa a vender.' },
            ].map(step => (
              <div key={step.n} className={styles.step}>
                <span className={styles.stepNum}>{step.n}</span>
                <h3>{step.t}</h3>
                <p>{step.s}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Planos ── */}
        <section className={styles.sectionAlt} id="planos">
          <h2 className={styles.sectionTitle}>Planos e preços</h2>
          <p className={styles.sectionSub}>
            Valor único de implantação + mensalidade de operação. Sem surpresas.
          </p>

          <div className={styles.launchNote}>
            <SparklesIcon size={16} />
            <span>
              Cortesia de lançamento: <strong>1 mês de mensalidade grátis</strong> para
              as primeiras contratações — vagas limitadas por plano.
            </span>
          </div>

          <div className={styles.plans}>
            {PLANOS.map(p => (
              <article key={p.nome} className={`${styles.plan} ${p.destaque ? styles.planFeatured : ''}`}>
                {p.destaque && <span className={styles.planTag}>Mais popular</span>}
                <h3>{p.nome}</h3>
                <p className={styles.planPersona}>{p.persona}</p>
                <div className={styles.planPrice}>
                  <span className={styles.planDeploy}>R$ {p.deploy}</span>
                  <span className={styles.planDeployLabel}>implantação única</span>
                </div>
                <div className={styles.planMonthly}>
                  + R$ {p.mensal}/mês <span>· no ar em {p.prazo}</span>
                </div>
                <ul className={styles.planList}>
                  {p.inclui.map(item => (
                    <li key={item}><CheckCircleIcon size={16} /> {item}</li>
                  ))}
                </ul>
                <button
                  className={`btn ${p.destaque ? 'btn-primary' : 'btn-secondary'} ${styles.planBtn}`}
                  onClick={() => escolherPlano(p.nome)}
                >
                  Contrate já
                </button>
              </article>
            ))}
          </div>

          <div className={styles.plansFootnotes}>
            <p>
              <strong>Incluído em todos os planos:</strong> loja online, dashboard do
              vendedor e app Android + PWA.
            </p>
            <p>
              <strong>Contratável por fora (opcional):</strong> domínio (~R$ 40/ano),
              hospedagem/VPS (~R$ 39/mês) e módulos extras sob orçamento.
            </p>
            <p>
              <strong>Custo por venda:</strong> apenas a taxa do meio de pagamento —
              PIX a partir de 0,99% (configurável). As funções da plataforma não têm
              custo de licença.
            </p>
          </div>
        </section>

        {/* ── Funcionalidades ── */}
        <section className={styles.section} id="funcionalidades">
          <h2 className={styles.sectionTitle}>Tudo o que a sua loja recebe</h2>
          <p className={styles.sectionSub}>Recursos de loja grande, sem complexidade de loja grande.</p>
          <div className={styles.features}>
            {FUNCIONALIDADES.map(({ Icon, titulo, texto }) => (
              <div key={titulo} className={styles.feature}>
                <div className={styles.featureIcon}><Icon size={22} /></div>
                <h3>{titulo}</h3>
                <p>{texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Missão / Visão / Valores ── */}
        <section className={styles.sectionAlt}>
          <h2 className={styles.sectionTitle}>O que acreditamos</h2>
          <div className={styles.mvv}>
            <div className={styles.mvvCard}>
              <h3>Missão</h3>
              <p>
                Democratizar o comércio digital, entregando a pequenos e médios negócios
                uma loja online profissional, própria e completa — sem barreiras técnicas
                e a um custo acessível.
              </p>
            </div>
            <div className={styles.mvvCard}>
              <h3>Visão</h3>
              <p>
                Ser a forma mais rápida e confiável de um negócio brasileiro colocar a
                sua loja no ar — com a sua cara, no seu domínio e com autonomia total.
              </p>
            </div>
            <div className={styles.mvvCard}>
              <h3>Valores</h3>
              <ul>
                {VALORES.map(v => (
                  <li key={v.titulo}>
                    <CheckCircleIcon size={16} />
                    <span><strong>{v.titulo}:</strong> {v.texto}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Perguntas frequentes</h2>
          <div className={styles.faq}>
            {FAQ.map(item => (
              <details key={item.q} className={styles.faqItem}>
                <summary>
                  {item.q}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── CTA final + contato ── */}
        <section className={styles.contact} id="contato">
          <div className={styles.contactIntro}>
            <h2>Pronto para colocar sua loja no ar?</h2>
            <p>
              Preencha os dados e fale direto com a gente no WhatsApp. Sem compromisso —
              respondemos com uma proposta clara para o seu negócio.
            </p>
          </div>

          <form className={styles.form} onSubmit={enviar}>
            <div className={styles.formRow}>
              <div className="form-group">
                <label htmlFor="ct-nome">Nome *</label>
                <input id="ct-nome" className="form-input" type="text" maxLength={80}
                  placeholder="Seu nome" value={form.nome} onChange={set('nome')} required />
              </div>
              <div className="form-group">
                <label htmlFor="ct-zap">WhatsApp *</label>
                <input id="ct-zap" className="form-input" type="tel" maxLength={15}
                  placeholder="(00) 00000-0000" value={form.whatsapp}
                  onChange={e => setForm(f => ({ ...f, whatsapp: applyPhoneMask(e.target.value) }))} required />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className="form-group">
                <label htmlFor="ct-email">E-mail</label>
                <input id="ct-email" className="form-input" type="email" maxLength={120}
                  placeholder="voce@email.com" value={form.email} onChange={set('email')} />
              </div>
              <div className="form-group">
                <label htmlFor="ct-seg">Tipo de negócio</label>
                <select id="ct-seg" className="form-select" value={form.segmento} onChange={set('segmento')}>
                  <option value="">Selecione…</option>
                  {SEGMENTOS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="ct-plano">Plano de interesse</label>
              <select id="ct-plano" className="form-select" value={form.plano} onChange={set('plano')}>
                <option value="">Ainda não sei</option>
                {PLANOS.map(p => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="ct-msg">Mensagem</label>
              <textarea id="ct-msg" className="form-input" rows={4} maxLength={600}
                placeholder="Conte um pouco sobre o seu negócio…"
                value={form.mensagem} onChange={set('mensagem')} />
            </div>

            <button type="submit" className={`btn btn-primary ${styles.formBtn}`}>
              <WhatsAppIcon size={18} />
              Contrate já pelo WhatsApp
            </button>
            <p className={styles.formHint}>
              Você será direcionado ao WhatsApp com a mensagem pronta — é só enviar.
            </p>
          </form>
        </section>

      </main>

      <Footer />
    </>
  );
}
