'use client';
import { useState } from 'react';
import { Goal, WeeklyPlan } from '@/types';

interface WeeklyPlanFormProps {
  goals: Goal[];
  initial?: WeeklyPlan;
  onSubmit: (data: {
    weekStart: string;
    goals: { text: string; done: boolean }[];
    memo: string;
    goalId?: string;
  }) => void;
  onCancel: () => void;
}

export default function WeeklyPlanForm({ goals, initial, onSubmit, onCancel }: WeeklyPlanFormProps) {
  const [goalEntries, setGoalEntries] = useState<{ text: string; done: boolean }[]>(() => {
    if (initial?.goals?.length) return initial.goals.map((g) => ({ ...g }));
    return [{ text: '', done: false }];
  });
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [linkedGoalId, setLinkedGoalId] = useState(initial?.goalId ?? '');

  const weekStart = initial
    ? new Date(initial.weekStart).toISOString().split('T')[0]
    : (() => {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now);
        monday.setDate(diff);
        monday.setHours(0, 0, 0, 0);
        return monday.toISOString().split('T')[0];
      })();

  const addGoal = () => {
    if (goalEntries.length < 5) setGoalEntries([...goalEntries, { text: '', done: false }]);
  };

  const updateGoalText = (i: number, text: string) => {
    const updated = [...goalEntries];
    updated[i] = { ...updated[i], text };
    setGoalEntries(updated);
  };

  const removeGoal = (i: number) => {
    setGoalEntries(goalEntries.filter((_, idx) => idx !== i));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validGoals = goalEntries.filter((g) => g.text.trim()).map((g) => ({ ...g, text: g.text.trim() }));
    onSubmit({
      weekStart,
      goals: validGoals,
      memo,
      ...(linkedGoalId ? { goalId: linkedGoalId } : {}),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">주간 시작일</label>
        <input
          type="text"
          value={weekStart}
          readOnly
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-gray-700">이번 주 목표 ({goalEntries.length}/5)</label>
          {goalEntries.length < 5 && (
            <button type="button" onClick={addGoal} className="text-xs text-blue-600 hover:text-blue-700">
              + 추가
            </button>
          )}
        </div>
        <div className="space-y-2">
          {goalEntries.map((entry, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={entry.text}
                onChange={(e) => updateGoalText(i, e.target.value)}
                placeholder={`목표 ${i + 1}`}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {goalEntries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeGoal(i)}
                  className="text-gray-400 hover:text-red-500 px-2"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {goals.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">연결할 1년 목표</label>
          <select
            value={linkedGoalId}
            onChange={(e) => setLinkedGoalId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">선택 안 함</option>
            {goals.map((g) => (
              <option key={g._id} value={g._id}>{g.title}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
          취소
        </button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          저장
        </button>
      </div>
    </form>
  );
}
