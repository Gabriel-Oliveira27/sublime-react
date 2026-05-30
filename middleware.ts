import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_ORIGIN =
  process.env.DASHBOARD_ORIGIN ?? 'https://gabriel-oliveira27.github.io'
  process.env.DASHBOARD_ORIGIN ?? 'https://dashboard-vendedor.vercel.app'

const CORS = {
  'Access-Control-Allow-Origin':      ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods':     'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers':     'Content-Type,Authorization',
  'Access-Control-Allow-Credentials': 'true',
}

export function middleware(req: NextRequest) {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: CORS })
  }

  const res = NextResponse.next()
  Object.entries(CORS).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

export const config = {
  matcher: '/api/:path*',
}
