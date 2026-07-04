// Camada de PIX online — abstrai o PSP (Mercado Pago) atrás de uma interface,
// com um provedor "mock" para rodar/testar LOCALMENTE sem credencial.
//
// Segurança: nada aqui confia em valor vindo do cliente. Quem chama já passa o
// valor recalculado no servidor. O webhook (ver app/api/webhooks/mercadopago)
// reconsulta o status direto no PSP antes de marcar o pedido como pago.

import QRCode from 'qrcode'
import type { PrismaClient } from '@prisma/client'
import { calcularTaxaPix } from './pixFee'

export type PixStatus = 'pendente' | 'aprovado' | 'expirado' | 'cancelado' | 'desconhecido'

export interface PixCharge {
  id: string            // id da cobrança no PSP (guardado em Pedido.pspPaymentId)
  copiaCola: string     // payload EMV do PIX (copia e cola)
  qrCodeDataUrl: string // imagem PNG do QR em data URL (pronta para <img src>)
  expiraEm: string      // ISO 8601
}

export interface PixProvider {
  nome: 'mercadopago' | 'mock'
  criarCobranca(input: {
    valor: number
    descricao: string
    orderId: string
    expiraEmMin: number
    payerEmail?: string
  }): Promise<PixCharge>
  consultarStatus(id: string): Promise<{ status: PixStatus; valor: number }>
}

/** Gera o QR (PNG data URL) a partir do payload copia-e-cola. */
export async function emvToDataUrl(emv: string): Promise<string> {
  return QRCode.toDataURL(emv, { margin: 1, width: 320, errorCorrectionLevel: 'M' })
}

// ─── Provedor: Mercado Pago (real) ───────────────────────────────────────────
const mercadoPago: PixProvider = {
  nome: 'mercadopago',
  async criarCobranca({ valor, descricao, orderId, expiraEmMin, payerEmail }) {
    const token = process.env.MP_ACCESS_TOKEN
    if (!token) throw new Error('MP_ACCESS_TOKEN ausente')
    const expira = new Date(Date.now() + expiraEmMin * 60_000)

    const res = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        // Idempotência: reenvio do mesmo pedido não gera cobrança duplicada.
        'X-Idempotency-Key': orderId,
      },
      body: JSON.stringify({
        transaction_amount: Number(valor.toFixed(2)),
        description: descricao,
        payment_method_id: 'pix',
        date_of_expiration: expira.toISOString().replace('Z', '+00:00'),
        payer: { email: payerEmail || 'comprador@sublime.app' },
      }),
    })
    if (!res.ok) throw new Error(`Mercado Pago: falha ao criar cobrança (${res.status})`)
    const data = await res.json()
    const emv = data?.point_of_interaction?.transaction_data?.qr_code
    if (!emv) throw new Error('Mercado Pago: resposta sem código PIX')

    return {
      id: String(data.id),
      copiaCola: emv,
      qrCodeDataUrl: await emvToDataUrl(emv),
      expiraEm: expira.toISOString(),
    }
  },
  async consultarStatus(id) {
    const token = process.env.MP_ACCESS_TOKEN
    if (!token) return { status: 'desconhecido', valor: 0 }
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return { status: 'desconhecido', valor: 0 }
    const d = await res.json()
    const valor = Number(d?.transaction_amount) || 0
    const s = String(d?.status || '')
    if (s === 'approved') return { status: 'aprovado', valor }
    if (s === 'cancelled' || s === 'rejected') return { status: 'cancelado', valor }
    if (s === 'expired') return { status: 'expirado', valor }
    return { status: 'pendente', valor }
  },
}

// ─── Provedor: Mock (local, sem credencial) ──────────────────────────────────
// Gera um copia-e-cola falso mas visualmente válido, para testar o fluxo/UX. A
// confirmação de pagamento no mock é feita pela rota /api/pagamentos/pix/simular.
const mock: PixProvider = {
  nome: 'mock',
  async criarCobranca({ valor, orderId, expiraEmMin }) {
    const expira = new Date(Date.now() + expiraEmMin * 60_000)
    const emv = `00020126MOCK-${orderId}-${Math.round(valor * 100)}5204000053039865802BR6009SUBLIME62070503***6304MOCK`
    return {
      id: `MOCK-${orderId}`,
      copiaCola: emv,
      qrCodeDataUrl: await emvToDataUrl(emv),
      expiraEm: expira.toISOString(),
    }
  },
  async consultarStatus() {
    // No mock, a confirmação é forçada via /simular (que marca o pedido pago).
    return { status: 'pendente', valor: 0 }
  },
}

/** Escolhe o provedor: Mercado Pago se houver token, senão o mock (dev/local). */
export function getPixProvider(): PixProvider {
  return process.env.MP_ACCESS_TOKEN ? mercadoPago : mock
}

export function pixModoMock(): boolean {
  return !process.env.MP_ACCESS_TOKEN
}

// ─── Config do PIX online, lida do banco (tabela Config) ─────────────────────
export interface PixTaxaConfig {
  ativo: boolean
  modo: 'NULA' | 'FIXA' | 'FAIXAS'
  fixa: { tipo: 'PERCENT' | 'REAIS'; valor: number }
  faixas: { min: number; tipo: 'PERCENT' | 'REAIS'; valor: number }[]
}

function parseJson<T>(raw: string | undefined | null, fallback: T): T {
  if (!raw) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}

/** Lê as chaves PIX_* da tabela Config e devolve o config normalizado. */
export async function lerPixConfig(db: PrismaClient): Promise<PixTaxaConfig> {
  const rows = await db.config.findMany({
    where: { chave: { in: ['PIX_ONLINE_ATIVO', 'PIX_TAXA_MODO', 'PIX_TAXA_FIXA', 'PIX_TAXA_FAIXAS'] } },
  })
  const m = Object.fromEntries(rows.map((r) => [r.chave, r.valor]))
  const modo = m['PIX_TAXA_MODO']
  return {
    ativo: m['PIX_ONLINE_ATIVO'] === 'true',
    modo: modo === 'FIXA' || modo === 'FAIXAS' ? modo : 'NULA',
    fixa: parseJson(m['PIX_TAXA_FIXA'], { tipo: 'PERCENT' as const, valor: 0 }),
    faixas: parseJson(m['PIX_TAXA_FAIXAS'], [] as PixTaxaConfig['faixas']),
  }
}

/** Reexporta o cálculo (fonte de verdade) para as rotas usarem. */
export { calcularTaxaPix }
