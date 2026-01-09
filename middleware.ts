import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_TOKEN } from './lib/admin-auth'

const publicPaths = ['/auth/login', '/auth/sign-up', '/clinica/login', '/admin/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic =
    publicPaths.includes(pathname) || pathname.startsWith('/api/') || pathname.startsWith('/public')

  if (isPublic) {
    return NextResponse.next()
  }

  const isAdminArea = pathname === '/' || pathname.startsWith('/admin')

  if (isAdminArea) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
    if (token !== ADMIN_SESSION_TOKEN) {
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
