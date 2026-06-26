import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exigirPermissao } from '@/lib/middleware'
import { CORS_HEADERS, corsOptions } from '@/lib/cors'

const FRETE_ID = 1

// Defaults usados quando ainda não há FreteConfig no banco
// Espelham o CONFIG.SHIPPING_TIERS atual para não quebrar quem ainda não configurou.
function defaultFrete() {
  return {
    modelo: 'VALOR',
    tiersValor: [
      { ate: 129,  taxa: 0    },
      { ate: 200,  taxa: 1.50 },
      { ate: 270,  taxa: 3.00 },
      { ate: 349,  taxa: 5.00 },
      { ate: 419,  taxa: 7.00 },
      { ate: null, taxa: 10.00 },
    ],
    origemLat: null, origemLon: null,
    origemEndereco: '', origemCep: '',
    origemCidade: '',  origemUF: '',
    custoKm: 1.50,    freteGratisAteKm: 0,
    valorFixo: 0,
    valorCidadeOrigem: 0, valorDemais: 0, cidadesEspeciais: [],
  }
}

function serialize(f: any) {
  return {
    modelo:            f.modelo,
    tiersValor:        f.tiersValor        ?? defaultFrete().tiersValor,
    origemLat:         f.origemLat,
    origemLon:         f.origemLon,
    origemEndereco:    f.origemEndereco,
    origemCep:         f.origemCep,
    origemCidade:      f.origemCidade,
    origemUF:          f.origemUF,
    custoKm:           f.custoKm,
    freteGratisAteKm:  f.freteGratisAteKm,
    valorFixo:         f.valorFixo,
    valorCidadeOrigem: f.valorCidadeOrigem,
    valorDemais:       f.valorDemais,
    cidadesEspeciais:  f.cidadesEspeciais  ?? [],
  }
}

// ── GET — público (loja é same-origin; dashboard precisa de CORS com credenciais) ──
export async function GET() {
  try {
    const frete = await prisma.freteConfig.findUnique({ where: { id: FRETE_ID } })
    const data  = frete ? serialize(frete) : defaultFrete()
    return NextResponse.json(data, {
      // CORS_HEADERS usa DASHBOARD_ORIGIN (variável de ambiente), não '*'.
      // Browsers bloqueiam 'Access-Control-Allow-Origin: *' quando a requisição
      // inclui credenciais (cookies). Como o apiFetch do dashboard sempre envia
      // credentials:'include', precisamos de uma origem específica aqui.
      headers: { ...CORS_HEADERS, 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('[GET /api/frete]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// ── PATCH — requer autenticação (dashboard) ───────────────────────────────────
export async function PATCH(req: NextRequest) {
  const auth = await exigirPermissao(req, 'config', 'editar')
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()

    const MODELOS = ['VALOR', 'KM', 'FIXO', 'CIDADE']
    if (!MODELOS.includes(body.modelo)) {
      return NextResponse.json(
        { erro: `Modelo inválido. Use: ${MODELOS.join(', ')}` },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Valida tiers se modelo VALOR
    if (body.modelo === 'VALOR') {
      if (!Array.isArray(body.tiersValor) || body.tiersValor.length === 0) {
        return NextResponse.json(
          { erro: 'tiersValor deve ser um array com ao menos uma faixa.' },
          { status: 400, headers: CORS_HEADERS }
        )
      }
    }

    const data = {
      modelo:            body.modelo,
      tiersValor:        body.tiersValor        ?? null,
      origemLat:         body.origemLat  != null ? parseFloat(String(body.origemLat))  : null,
      origemLon:         body.origemLon  != null ? parseFloat(String(body.origemLon))  : null,
      origemEndereco:    String(body.origemEndereco ?? ''),
      origemCep:         String(body.origemCep      ?? '').replace(/\D/g, ''),
      origemCidade:      String(body.origemCidade   ?? ''),
      origemUF:          String(body.origemUF       ?? ''),
      custoKm:           parseFloat(String(body.custoKm          ?? 1.50)) || 1.50,
      freteGratisAteKm:  parseFloat(String(body.freteGratisAteKm ?? 0))    || 0,
      valorFixo:         parseFloat(String(body.valorFixo         ?? 0))    || 0,
      valorCidadeOrigem: parseFloat(String(body.valorCidadeOrigem ?? 0))    || 0,
      valorDemais:       parseFloat(String(body.valorDemais       ?? 0))    || 0,
      cidadesEspeciais:  Array.isArray(body.cidadesEspeciais) ? body.cidadesEspeciais : null,
    }

    const saved = await prisma.freteConfig.upsert({
      where:  { id: FRETE_ID },
      update: data,
      create: { id: FRETE_ID, ...data },
    })

    return NextResponse.json(serialize(saved), { headers: CORS_HEADERS })
  } catch (err) {
    console.error('[PATCH /api/frete]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500, headers: CORS_HEADERS })
  }
}

export function OPTIONS() { return corsOptions() }