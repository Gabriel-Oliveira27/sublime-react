import './globals.css';
import { Allura }         from 'next/font/google';
import { CartProvider }   from '@/context/CartContext';
import { ConfigProvider } from '@/context/ConfigContext';
import { ToastProvider }  from '@/context/ToastContext';
import ToastContainer     from '@/components/ui/ToastContainer';
import ErrorBoundary      from '@/components/ErrorBoundary';
import PwaProvider        from '@/components/pwa/PwaProvider';

// Fonte cursiva do branding "Sublime". Auto-hospedada pelo Next (mais
// confiável que @import do Google Fonts, que pode falhar e cair no `cursive`
// genérico). Exposta como a CSS var --font-brand para reuso/re-tematização.
const brandFont = Allura({
  weight:   '400',
  subsets:  ['latin'],
  display:  'swap',
  variable: '--font-brand',
});

// Cor da barra do navegador/janela quando instalado como PWA
export const viewport = {
  themeColor: '#E84D82',
};

export const metadata = {
  title: 'Sublime — Produtos Tupperware',
  description: 'Produtos Tupperware de qualidade para o seu dia a dia.',
  icons: {
  icon: [
    { url: '/logo/favicon.ico' },
    { url: '/logo/favicon.svg', type: 'image/svg+xml' },
  ],
  apple: '/logo/apple-touch-icon.png',
  other: [
    { rel: 'icon', sizes: '192x192', url: '/logo/icon-192.png' },
    { rel: 'icon', sizes: '512x512', url: '/logo/icon-512.png' },
  ],
},
};


export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={brandFont.variable}>
      <body>
        <ToastProvider>
          <ConfigProvider>
          <CartProvider>
            <ErrorBoundary>
            {children}
            <ToastContainer />
            <PwaProvider />
            </ErrorBoundary>
          </CartProvider>
        </ConfigProvider>
        </ToastProvider>
      </body>
    </html>
  );
}