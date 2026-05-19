import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { signSession, attachSession } from '@/lib/session';

const STATE_COOKIE = 'oauth_state';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? '';

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/login?error=missing_code`);
  }

  const cookieHeader = req.headers.get('cookie') ?? '';
  const stateCookie = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${STATE_COOKIE}=`))
    ?.split('=')[1];

  if (!stateCookie || stateCookie !== state) {
    return NextResponse.redirect(`${baseUrl}/login?error=invalid_state`);
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_not_configured`);
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${baseUrl}/api/auth/github/callback`,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${baseUrl}/login?error=token_exchange_failed`);
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenData.access_token) {
    return NextResponse.redirect(`${baseUrl}/login?error=${tokenData.error ?? 'no_token'}`);
  }

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!userRes.ok) {
    return NextResponse.redirect(`${baseUrl}/login?error=user_fetch_failed`);
  }

  const ghUser = (await userRes.json()) as {
    id: number;
    login: string;
    avatar_url: string;
  };

  await connectDB();
  const user = await User.findOneAndUpdate(
    { githubId: String(ghUser.id) },
    {
      githubId: String(ghUser.id),
      username: ghUser.login,
      avatarUrl: ghUser.avatar_url,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const token = await signSession({
    userId: user._id.toString(),
    githubId: user.githubId,
    username: user.username,
  });

  const res = NextResponse.redirect(`${baseUrl}/`);
  attachSession(res, token);
  res.cookies.set(STATE_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
