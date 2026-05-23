import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE = 'session';
const PROTECTED_PREFIXES = ['/', '/todos', '/weekly', '/goals'];
const LOGIN_PATH = '/login';

function isProtected(pathname: string): boolean {
  if (pathname === '/') return true;
  return PROTECTED_PREFIXES.some((p) => p !== '/' && pathname.startsWith(p));
}

async function isSessionValid(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const valid = await isSessionValid(token);

  if (pathname === LOGIN_PATH) {
    if (valid) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (isProtected(pathname) && !valid) {
    const url = req.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/todos/:path*', '/weekly/:path*', '/goals/:path*', '/login'],
};
