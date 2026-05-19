import 'dotenv/config'
import cloudinary from '../lib/cloudinary'
import * as path from 'path'

async function main() {
  const resultado = await cloudinary.uploader.upload(
    path.join(__dirname, '../public/teste.jpg'), // coloca qualquer imagem aqui
    { folder: 'sublime/teste' }
  )
  console.log('✅ Cloudinary funcionando!')
  console.log('URL:', resultado.secure_url)
}

main().catch((e) => console.error('❌ Erro:', e.message))