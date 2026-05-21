import { NextRequest, NextResponse } from 'next/server'
import cloudinary from '@/lib/cloudinary'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ erro: 'Nenhum arquivo enviado' }, { status: 400 })
  }

  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const resultado = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder:          'sublime/produtos',
            use_filename:    true,
            unique_filename: true,
            overwrite:       false,
          },
          (error, result) => {
            if (error || !result) reject(error)
            else resolve(result as any)
          }
        )
        .end(buffer)
    }
  )

  return NextResponse.json({
    url:      resultado.secure_url,
    publicId: resultado.public_id,
  })
}
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
  })
}
