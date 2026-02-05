import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname !== "/") {
    return NextResponse.next()
  }

  const nextUrl = request.nextUrl.clone()

  if (nextUrl.searchParams.has("redirectTo")) {
    nextUrl.searchParams.delete("redirectTo")
    return NextResponse.redirect(nextUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/"],
}
