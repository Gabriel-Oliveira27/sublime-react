// Manifest do PWA — permite instalar a loja na tela inicial e habilita as
// notificações push de status do pedido/carrinho. Servido em /manifest.webmanifest.
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sublime — Produtos Tupperware',
    short_name: 'Sublime',
    description: 'Produtos Tupperware de qualidade para o seu dia a dia.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FDF8F2',
    theme_color: '#E84D82',
    icons: [
      { src: '/logo/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/logo/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/logo/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
