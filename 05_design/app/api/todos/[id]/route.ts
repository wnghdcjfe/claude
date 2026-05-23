import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Todo from '@/models/Todo';
import { normalizeTodoData, syncWeeklyGoalDone } from '@/lib/todoSync';
import { requireUser, isUnauthorized } from '@/lib/auth';

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (isUnauthorized(user)) return user;
  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  try {
    await connectDB();
    const todo = await Todo.findOne({ _id: id, userId: user._id });
    if (!todo) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(todo);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (isUnauthorized(user)) return user;
  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  try {
    await connectDB();
    const body = normalizeTodoData(await req.json());
    delete body.userId;
    const todo = await Todo.findOneAndUpdate(
      { _id: id, userId: user._id },
      body,
      { new: true, runValidators: true }
    );
    if (!todo) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await syncWeeklyGoalDone(
      todo.weeklyPlanId?.toString(),
      todo.weeklyGoalIndex,
      todo.status,
      user._id
    );
    return NextResponse.json(todo);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (isUnauthorized(user)) return user;
  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  try {
    await connectDB();
    const todo = await Todo.findOneAndDelete({ _id: id, userId: user._id });
    if (!todo) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (isUnauthorized(user)) return user;
  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  try {
    await connectDB();
    const body = await req.json();
    const updateData: Record<string, unknown> = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.order !== undefined) updateData.order = body.order;
    const todo = await Todo.findOneAndUpdate(
      { _id: id, userId: user._id },
      updateData,
      { new: true, runValidators: true }
    );
    if (!todo) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (body.status !== undefined) {
      await syncWeeklyGoalDone(
        todo.weeklyPlanId?.toString(),
        todo.weeklyGoalIndex,
        todo.status,
        user._id
      );
    }
    return NextResponse.json(todo);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
