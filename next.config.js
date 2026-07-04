/** @type {import('next').NextConfig} */

// ─────────────────────────────────────────────────────────────────────────────
//  Config ÚNICA do Next.
//
//  Antes existiam DOIS arquivos: next.config.js e next.config.mjs. O Next resolve
//  apenas o primeiro (.js), então TODO o conteúdo do .mjs — incluindo o header
//  Strict-Transport-Security (HSTS) e poweredByHeader:false — era silenciosamente
//  ignorado. Os dois foram unificados aqui.
//
//  CORS das rotas /api é tratado pelo middleware.ts (Access-Control-Allow-Origin:
//  DASHBOARD_ORIGIN, com suporte a credentials). Não repetir CORS aqui.
// ─────────────────────────────────────────────────────────────────────────────

const CSP = [
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
].join('; ')

const nextConfig = {
  // Não vaza a versão do Next em X-Powered-By (reconhecimento facilitado).
  poweredByHeader: false,

  async headers() {
    return [
      {
        // Cabeçalhos de segurança das páginas HTML da loja (não afeta /api —
        // o middleware.ts cuida das rotas de API).
        source: '/((?!api).*)',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'X-Frame-Options',          value: 'DENY' },
          { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',       value: 'geolocation=(), microphone=(), camera=(), payment=()' },
        ],
      },
      {
        // HSTS em TODAS as respostas (inclui /api). Força HTTPS por 2 anos.
        // Recuperado do antigo next.config.mjs, que nunca chegava a ser lido.
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
