import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ sucesso: true })
  // Apaga o cookie definindo Max-Age=0
  res.headers.set('Set-Cookie', 'sublime_auth=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0')
  return res
}