import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, checkPassword, getSessionCookieValue } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === 'string' ? body.password : '';

  if (!checkPassword(password)) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  const value = getSessionCookieValue();
  if (value) {
    response.cookies.set(SESSION_COOKIE_NAME, value, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
