export const ALLOWED_ORIGIN =
  process.env.DASHBOARD_ORIGIN ?? 'https://gabriel-oliveira27.github.io'

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin':      ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods':     'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers':     'Content-Type,Authorization',
  'Access-Control-Allow-Credentials': 'true',
}

export function corsOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export function corsJson(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: { ...CORS_HEADERS, ...(init?.headers ?? {}) },
  })
}