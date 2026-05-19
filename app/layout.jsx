import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { ToastProvider } from '@/context/ToastContext';
import ToastContainer from '@/components/ui/ToastContainer';

export const metadata = {
  title: 'Sublime — Produtos Tupperware',
  description: 'Produtos Tupperware de qualidade para o seu dia a dia.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <ToastProvider>
          <CartProvider>
            {children}
            <ToastContainer />
          </CartProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
