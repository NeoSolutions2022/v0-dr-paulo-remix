import { NextRequest, NextResponse } from 'next/server'

import {
  ADMIN_EMAIL,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TOKEN,
  isValidAdminCredentials,
} from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
  }

  if (!isValidAdminCredentials(email, password)) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
  }

  const response = NextResponse.json({
    success: true,
    admin: {
      email: ADMIN_EMAIL,
    },
  })

  response.cookies.set(ADMIN_SESSION_COOKIE, ADMIN_SESSION_TOKEN, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 8, // 8 horas
  })

  return response
}
