import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WeeklyPlan from '@/models/WeeklyPlan';
import { getWeekStart } from '@/lib/utils';
import { requireUser, isUnauthorized } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await requireUser();
  if (isUnauthorized(user)) return user;
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const weekStartParam = searchParams.get('weekStart');
    const filter: Record<string, unknown> = { userId: user._id };
    if (weekStartParam) filter.weekStart = new Date(weekStartParam);
    const plans = await WeeklyPlan.find(filter).sort({ weekStart: -1 }).limit(20);
    return NextResponse.json(plans);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (isUnauthorized(user)) return user;
  try {
    await connectDB();
    const body = await req.json();
    delete body.userId;
    if (body.weekStart) body.weekStart = getWeekStart(new Date(body.weekStart));
    const plan = await WeeklyPlan.create({ ...body, userId: user._id });
    return NextResponse.json(plan, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json({ error: 'Weekly plan already exists for this week' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create weekly plan' }, { status: 400 });
  }
}
