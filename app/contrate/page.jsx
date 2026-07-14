import ContrateLanding from './ContrateLanding';

// Wrapper server-side: permite exportar metadata (SEO) enquanto a landing em
// si é client component (formulário, FAQ interativo).
export const metadata = {
  title: 'Contrate já — Sua loja online profissional | Sublime',
  description:
    'SaaS de vendas whitelabel: loja online completa com a sua marca, dashboard ' +
    'do vendedor e app Android + PWA. Planos a partir de R$ 149 de implantação. ' +
    'No ar em até 15 dias.',
};

export default function ContratePage() {
  return <ContrateLanding />;
}
