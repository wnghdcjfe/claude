import WeeklyPlan from '@/models/WeeklyPlan';

export function computeDayOfWeek(dueDate: Date): number {
  return dueDate.getDay();
}

export async function syncWeeklyGoalDone(
  weeklyPlanId: string | undefined | null,
  weeklyGoalIndex: number | undefined | null,
  status: 'todo' | 'doing' | 'done',
  userId: string
): Promise<void> {
  if (!weeklyPlanId || weeklyGoalIndex === undefined || weeklyGoalIndex === null) return;
  const plan = await WeeklyPlan.findOne({ _id: weeklyPlanId, userId }).select('goals').lean();
  if (!plan) return;
  if (weeklyGoalIndex < 0 || weeklyGoalIndex >= plan.goals.length) return;
  const nextDone = status === 'done';
  await WeeklyPlan.findOneAndUpdate(
    { _id: weeklyPlanId, userId },
    { $set: { [`goals.${weeklyGoalIndex}.done`]: nextDone } }
  );
}

export function normalizeTodoData(body: Record<string, unknown>): Record<string, unknown> {
  const data = { ...body };
  if (data.dueDate) {
    const date = new Date(data.dueDate as string);
    if (!isNaN(date.getTime())) {
      data.dayOfWeek = computeDayOfWeek(date);
    }
  }
  return data;
}
