import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Goal from '@/models/Goal';
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
    const goal = await Goal.findOne({ _id: id, userId: user._id });
    if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(goal);
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
    const body = await req.json();
    delete body.userId;
    const goal = await Goal.findOneAndUpdate(
      { _id: id, userId: user._id },
      body,
      { new: true, runValidators: true }
    );
    if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(goal);
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
    const goal = await Goal.findOneAndDelete({ _id: id, userId: user._id });
    if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
