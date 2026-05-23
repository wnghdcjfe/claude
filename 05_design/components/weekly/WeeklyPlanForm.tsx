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
    const validGoals = goalEntries
      .filter((g) => g.text.trim())
      .map((g) => ({ ...g, text: g.text.trim() }));
    onSubmit({
      weekStart,
      goals: validGoals,
      memo,
      ...(linkedGoalId ? { goalId: linkedGoalId } : {}),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Week start — read-only */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: '#6a6a6a' }}>
          주간 시작일
        </label>
        <input
          type="text"
          value={weekStart}
          readOnly
          className="ab-input"
          style={{ backgroundColor: '#f7f7f7', color: '#929292' }}
        />
      </div>

      {/* Weekly goals */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-medium" style={{ color: '#6a6a6a' }}>
            이번 주 목표 ({goalEntries.length}/5)
          </label>
          {goalEntries.length < 5 && (
            <button
              type="button"
              onClick={addGoal}
              className="text-xs font-medium"
              style={{ color: '#ff385c' }}
            >
              + 추가
            </button>
          )}
        </div>
        <div className="space-y-2">
          {goalEntries.map((entry, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                value={entry.text}
                onChange={(e) => updateGoalText(i, e.target.value)}
                placeholder={`목표 ${i + 1}`}
                className="ab-input flex-1"
              />
              {goalEntries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeGoal(i)}
                  className="text-lg leading-none shrink-0"
                  style={{ color: '#929292' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#c13515')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#929292')}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Memo */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: '#6a6a6a' }}>
          메모
        </label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          className="ab-input"
        />
      </div>

      {/* Link to 1-year goal */}
      {goals.length > 0 && (
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#6a6a6a' }}>
            연결할 1년 목표
          </label>
          <select
            value={linkedGoalId}
            onChange={(e) => setLinkedGoalId(e.target.value)}
            className="ab-input"
          >
            <option value="">선택 안 함</option>
            {goals.map((g) => (
              <option key={g._id} value={g._id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="btn-ghost">
          취소
        </button>
        <button type="submit" className="btn-rausch">
          저장
        </button>
      </div>
    </form>
  );
}
