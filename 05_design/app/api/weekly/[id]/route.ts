import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import WeeklyPlan from '@/models/WeeklyPlan';
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
    const plan = await WeeklyPlan.findOne({ _id: id, userId: user._id });
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(plan);
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
    const plan = await WeeklyPlan.findOneAndUpdate(
      { _id: id, userId: user._id },
      body,
      { new: true, runValidators: true }
    );
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(plan);
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
    const plan = await WeeklyPlan.findOneAndDelete({ _id: id, userId: user._id });
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
    const { goalIndex } = await req.json();
    const plan = await WeeklyPlan.findOne({ _id: id, userId: user._id });
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (goalIndex < 0 || goalIndex >= plan.goals.length) {
      return NextResponse.json({ error: 'Invalid goal index' }, { status: 400 });
    }
    plan.goals[goalIndex].done = !plan.goals[goalIndex].done;
    await plan.save();
    return NextResponse.json(plan);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
