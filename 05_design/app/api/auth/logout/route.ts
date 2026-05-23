import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/session';

function buildLogoutResponse(): NextResponse {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? '';
  const res = NextResponse.redirect(`${baseUrl}/login`);
  return clearSession(res);
}

export async function GET() {
  return buildLogoutResponse();
}

export async function POST() {
  return buildLogoutResponse();
}
