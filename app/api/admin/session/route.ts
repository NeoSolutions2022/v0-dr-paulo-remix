import { NextRequest, NextResponse } from 'next/server'

import { ADMIN_SESSION_COOKIE, hasValidAdminSession } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const cookieValue = request.cookies.get(ADMIN_SESSION_COOKIE)?.value

  if (!hasValidAdminSession(cookieValue)) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({ authenticated: true })
}
