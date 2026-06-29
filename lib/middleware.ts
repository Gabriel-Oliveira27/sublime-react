import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt, JwtPayload } from './jwt'

export async function autenticar(
  req: NextRequest
): Promise<{ usuario: JwtPayload } | NextResponse> {
  // 1. Cookie httpOnly (método seguro principal)
  let token = req.cookies.get('sublime_auth')?.value ?? ''

  // 2. Fallback: Authorization header (compatibilidade durante migração)
  if (!token) {
    const auth = req.headers.get('Authorization') ?? ''
    token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  }

  if (!token) {
    return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  }

  const payload = await verifyJwt(token)
  if (!payload) {
    return NextResponse.json({ erro: 'Sessão expirada' }, { status: 401 })
  }

  return { usuario: payload }
}

export type ModuloPermissao = 'estoque' | 'pedidos' | 'cupons' | 'config' | 'usuarios'

/** Verifica se o usuário tem o nível de permissão pedido em um módulo. Admin sempre pode. */
export function temPermissao(
  usuario: JwtPayload,
  modulo: ModuloPermissao,
  nivel: 'ver' | 'editar'
): boolean {
  if (usuario.isAdmin) return true
  const p = usuario.permissoes?.[modulo]
  return !!p && p[nivel] === true
}

/**
 * Autentica E exige uma permissão específica. Sem isto, qualquer sessão válida
 * (mesmo um funcionário "somente leitura") conseguia editar via chamada direta
 * à API — as permissões só eram aplicadas na UI do dashboard.
 *
 * Retorna o usuário autenticado ou uma resposta 401/403 pronta.
 */
export async function exigirPermissao(
  req: NextRequest,
  modulo: ModuloPermissao,
  nivel: 'ver' | 'editar'
): Promise<{ usuario: JwtPayload } | NextResponse> {
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth
  if (!temPermissao(auth.usuario, modulo, nivel)) {
    return NextResponse.json({ erro: 'Sem permissão para esta ação' }, { status: 403 })
  }
  return auth
}

/** Configurações do cookie de autenticação */
export const COOKIE_OPTIONS =
  'HttpOnly; Secure; SameSite=None; Path=/; Max-Age=604800' // 7 dias