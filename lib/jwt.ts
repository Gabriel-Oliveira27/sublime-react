import { SignJWT, jwtVerify } from 'jose'

// Validação lazy: evita que `next build` quebre quando a env não está presente
// no ambiente de build, mas falha de forma clara em runtime se o segredo
// estiver ausente ou fraco (em vez de gerar um segredo "undefined" silencioso).
function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET
  if (!s || s.length < 16) {
    throw new Error(
      'JWT_SECRET ausente ou fraco — defina uma env com pelo menos 16 caracteres.'
    )
  }
  return new TextEncoder().encode(s)
}

export interface JwtPayload {
  id:         number
  nome:       string
  apelido:    string
  isAdmin:    boolean
  permissoes: Record<string, { ver: boolean; editar: boolean }> | null
}

export async function signJwt(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  const secret = getSecret() // fora do try: misconfig de env deve aflorar, não virar 401
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}