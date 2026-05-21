import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasUrl: !!process.env.DATABASE_URL,
    hasJwt: !!process.env.JWT_SECRET,
    urlStart: process.env.DATABASE_URL?.slice(0, 20) ?? 'VAZIO',
  })
}