import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Todo from '@/models/Todo';
import { normalizeTodoData, syncWeeklyGoalDone } from '@/lib/todoSync';
import { requireUser, isUnauthorized } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await requireUser();
  if (isUnauthorized(user)) return user;
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const filter: Record<string, unknown> = { userId: user._id };
    const status = searchParams.get('status');
    const weeklyPlanId = searchParams.get('weeklyPlanId');
    const goalId = searchParams.get('goalId');
    if (status) filter.status = status;
    if (weeklyPlanId) filter.weeklyPlanId = weeklyPlanId;
    if (goalId) filter.goalId = goalId;
    const todos = await Todo.find(filter).sort({ status: 1, order: 1 });
    return NextResponse.json(todos);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (isUnauthorized(user)) return user;
  try {
    await connectDB();
    const body = normalizeTodoData(await req.json());
    delete body.userId;
    const todo = await Todo.create({ ...body, userId: user._id });
    await syncWeeklyGoalDone(
      todo.weeklyPlanId?.toString(),
      todo.weeklyGoalIndex,
      todo.status,
      user._id
    );
    return NextResponse.json(todo, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 400 });
  }
}
