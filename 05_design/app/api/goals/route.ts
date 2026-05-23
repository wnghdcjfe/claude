import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Goal from '@/models/Goal';
import { requireUser, isUnauthorized } from '@/lib/auth';

export async function GET() {
  const user = await requireUser();
  if (isUnauthorized(user)) return user;
  try {
    await connectDB();
    const goals = await Goal.find({ userId: user._id }).sort({ createdAt: -1 });
    return NextResponse.json(goals);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (isUnauthorized(user)) return user;
  try {
    await connectDB();
    const body = await req.json();
    delete body.userId;
    const goal = await Goal.create({ ...body, userId: user._id });
    return NextResponse.json(goal, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 400 });
  }
}
