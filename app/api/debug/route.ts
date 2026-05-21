import { NextResponse } from 'next/server'


export async function GET() {
  const url = process.env.DATABASE_URL ?? 'UNDEFINED'
  return NextResponse.json({
    hasUrl:   url !== 'UNDEFINED',
    length:   url.length,
    start:    url.slice(0, 40),
    end:      url.slice(-20),
  })
}