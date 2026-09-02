import { NextRequest, NextResponse } from 'next/server'

/**
 * Middleware for route protection
 * Protects /user/* and /admin/* routes from unauthenticated access
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Protected routes
  const protectedPaths = ['/user', '/admin']
  const publicAuthPaths = ['/auth']

  // Check if path requires authentication
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path))
  const isPublicAuthPath = publicAuthPaths.some((path) => pathname.startsWith(path))

  // Get auth token from cookie
  const authToken = request.cookies.get('sb-access-token')?.value

  // If trying to access protected route without auth, redirect to signin
  if (isProtectedPath && !authToken) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // If already authenticated and trying to access auth pages, redirect to dashboard
  if (isPublicAuthPath && authToken) {
    return NextResponse.redirect(new URL('/user/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Protect user routes
    '/user/:path*',
    // Protect admin routes
    '/admin/:path*',
    // Allow auth routes
    '/auth/:path*',
  ],
}
