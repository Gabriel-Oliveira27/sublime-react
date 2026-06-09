/** @type {import('next').NextConfig} */
const nextConfig = {
  // CORS removido daqui — era conflito com middleware.ts.
  // O middleware.ts já aplica Access-Control-Allow-Origin: DASHBOARD_ORIGIN
  // em todas as rotas /api/:path*, com suporte a credentials:'include'.

  async headers() {
    return [
      {
        // Cabeçalhos de segurança para todas as páginas HTML da loja
        // (não afeta as rotas /api — o middleware já cuida delas)
        source: '/((?!api).*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' vercel.live *.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' cdnjs.cloudflare.com",
              "img-src 'self' data: blob: https://res.cloudinary.com https://*.cloudinary.com https://*.openstreetmap.org",
              "font-src 'self' data: cdnjs.cloudflare.com",
              "connect-src 'self' https://sublime-react.vercel.app https://viacep.com.br https://nominatim.openstreetmap.org https://api.cloudinary.com cdnjs.cloudflare.com",
              "frame-ancestors 'none'",
              "frame-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "worker-src blob:",
            ].join('; '),
          },
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'X-Frame-Options',          value: 'DENY' },
          { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',       value: 'geolocation=(), microphone=(), camera=(), payment=()' },
        ],
      },
    ]
  },
}

module.exports = nextConfig