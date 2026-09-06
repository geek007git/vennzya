import { getSessionCookie } from 'better-auth/cookies'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Edge middleware can't reach Prisma, so this only proves a session cookie is
 * present and well-formed — enough to bounce anonymous traffic away from the
 * admin UI early. The real authorisation (is this user staff, do they hold
 * this permission?) happens in the tRPC `requirePermission` middleware, which
 * runs on Node and reads the database. Never treat this file as the gate.
 */
export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request, { cookiePrefix: 'vennzya' })

  if (!sessionCookie) {
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/((?!login).*)'],
}
