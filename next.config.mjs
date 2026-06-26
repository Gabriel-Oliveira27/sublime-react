/** @type {import('next').NextConfig} */

// Headers de segurança aplicados a todas as respostas.
// CSP foi deixada de fora de propósito — exige mapear fontes externas
// (Google Fonts, Cloudinary, ViaCEP, Nominatim) e estilos inline; adicione
// depois com cuidado para não quebrar o app.
const securityHeaders = [
  { key: 'X-Content-Type-Options',   value: 'nosniff' },
  { key: 'X-Frame-Options',          value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',       value: 'geolocation=(self), camera=(), microphone=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig = {
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
