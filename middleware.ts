import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Permitir todas as rotas públicas e de API sem verificação
  const publicPaths = ['/', '/auth/login', '/auth/sign-up', '/clinica/login', '/api']
  
  const isPublic = publicPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith('/api/')
  )
  
  if (isPublic) {
    return NextResponse.next()
  }
  
  // Para rotas protegidas, apenas continuar (autenticação será feita nas páginas)
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
