'use client';
import { Goal } from '@/types';

interface GoalProgressProps {
  goal: Goal;
}

export default function GoalProgress({ goal }: GoalProgressProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span style={{ color: '#3f3f3f' }}>{goal.title}</span>
        <span className="font-medium" style={{ color: '#222222' }}>
          {goal.progress}%
        </span>
      </div>
      <div className="w-full rounded-full h-1.5" style={{ backgroundColor: '#f2f2f2' }}>
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${goal.progress}%`, backgroundColor: '#ff385c' }}
        />
      </div>
    </div>
  );
}
