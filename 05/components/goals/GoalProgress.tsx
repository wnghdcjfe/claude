'use client';
import { Goal } from '@/types';

interface GoalProgressProps {
  goal: Goal;
}

export default function GoalProgress({ goal }: GoalProgressProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{goal.title}</span>
        <span className="font-medium text-gray-900">{goal.progress}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${goal.progress}%` }}
        />
      </div>
    </div>
  );
}
