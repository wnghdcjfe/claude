import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User, { IUser } from '@/models/User';
import { getSession } from '@/lib/session';

export interface CurrentUser {
  _id: string;
  githubId: string;
  username: string;
  avatarUrl: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;
  await connectDB();
  const user = await User.findById(session.userId).lean<IUser & { _id: { toString(): string } }>();
  if (!user) return null;
  return {
    _id: user._id.toString(),
    githubId: user.githubId,
    username: user.username,
    avatarUrl: user.avatarUrl,
  };
}

export async function requireUser(): Promise<CurrentUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return user;
}

export function isUnauthorized(value: CurrentUser | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
