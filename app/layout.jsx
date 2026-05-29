import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { ConfigProvider } from '@/context/ConfigContext';
import { ToastProvider } from '@/context/ToastContext';
import ToastContainer from '@/components/ui/ToastContainer';

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
    <html lang="pt-BR">
      <body>
        <ToastProvider>
          <ConfigProvider>
          <CartProvider>
            {children}
            <ToastContainer />
          </CartProvider>
        </ConfigProvider>
        </ToastProvider>
      </body>
    </html>
  );
}