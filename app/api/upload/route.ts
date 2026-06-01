import { NextRequest, NextResponse } from 'next/server'
import cloudinary from '@/lib/cloudinary'
import { autenticar } from '@/lib/middleware'
import { CORS_HEADERS, corsOptions } from '@/lib/cors'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES     = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  // Sem autenticação, qualquer pessoa podia fazer upload ilimitado
  // e esgotar os créditos do Cloudinary. Agora exige sessão válida.
  const auth = await autenticar(req)
  if (auth instanceof NextResponse) return auth

  let file: File | null = null
  try {
    const form = await req.formData()
    file = form.get('file') as File | null
  } catch {
    return NextResponse.json({ erro: 'Payload inválido' }, { status: 400, headers: CORS_HEADERS })
  }

  if (!file) {
    return NextResponse.json({ erro: 'Nenhum arquivo enviado' }, { status: 400, headers: CORS_HEADERS })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { erro: 'Formato não permitido. Use JPG, PNG, WEBP ou GIF.' },
      { status: 415, headers: CORS_HEADERS }
    )
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { erro: 'Arquivo muito grande. Limite: 10 MB.' },
      { status: 413, headers: CORS_HEADERS }
    )
  }

  try {
    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const resultado = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: 'sublime/produtos', use_filename: true, unique_filename: true, overwrite: false },
            (error, result) => { if (error || !result) reject(error); else resolve(result as any) }
          )
          .end(buffer)
      }
    )

    return NextResponse.json(
      { url: resultado.secure_url, publicId: resultado.public_id },
      { headers: CORS_HEADERS }
    )
  } catch (err) {
    console.error('[POST /api/upload]', err)
    return NextResponse.json({ erro: 'Erro no upload' }, { status: 500, headers: CORS_HEADERS })
  }
}

export function OPTIONS() { return corsOptions() }
