import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token');
  let isValid = false;

  if (token && token.value) {
    const parts = token.value.split('.');
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && payload.exp * 1000 > Date.now()) {
          isValid = true;
        }
      } catch (e) {
        // invalid
      }
    }
  }

  // Force clear cookie if clear=true is passed
  if (request.nextUrl.searchParams.get('clear') === 'true') {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    return response;
  }

  // If the user does not have a token and is not on the login page, redirect them
  if (!isValid && !request.nextUrl.pathname.startsWith('/login')) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    return response;
  }

  // If the user is logged in and tries to access login page, redirect to dashboard (to be built later)
  if (isValid && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
