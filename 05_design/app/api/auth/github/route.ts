import { NextResponse } from 'next/server';
import crypto from 'crypto';

const STATE_COOKIE = 'oauth_state';

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!clientId || !baseUrl) {
    return NextResponse.json(
      { error: 'GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and NEXT_PUBLIC_BASE_URL.' },
      { status: 500 }
    );
  }

  const state = crypto.randomBytes(16).toString('hex');
  const callbackUrl = `${baseUrl}/api/auth/github/callback`;
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('scope', 'read:user');
  authUrl.searchParams.set('state', state);

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
