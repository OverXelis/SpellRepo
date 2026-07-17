import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, isAuthRequired, isValidSessionCookie } from '@/lib/auth';

export function proxy(request: NextRequest) {
  if (!isAuthRequired()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === '/login' || pathname.startsWith('/api/auth/login')) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (isValidSessionCookie(cookie)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
