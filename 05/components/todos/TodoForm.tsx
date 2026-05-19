'use client';
import { useState, useMemo } from 'react';
import { Goal, WeeklyPlan, TodoPriority, TodoStatus, Todo } from '@/types';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

interface TodoFormProps {
  goals: Goal[];
  weeklyPlans: WeeklyPlan[];
  todos: Todo[];
  initial?: {
    _id?: string;
    title?: string;
    description?: string;
    status?: TodoStatus;
    priority?: TodoPriority;
    dueDate?: string;
    weeklyPlanId?: string;
    weeklyGoalIndex?: number;
    goalId?: string;
  };
  onSubmit: (data: {
    title: string;
    description: string;
    status: TodoStatus;
    priority: TodoPriority;
    dueDate?: string;
    weeklyPlanId?: string;
    weeklyGoalIndex?: number;
    goalId?: string;
  }) => void;
  onCancel: () => void;
}

export default function TodoForm({ goals, weeklyPlans, todos, initial, onSubmit, onCancel }: TodoFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState<TodoStatus>(initial?.status ?? 'todo');
  const [priority, setPriority] = useState<TodoPriority>(initial?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(initial?.dueDate ? initial.dueDate.split('T')[0] : '');
  const [weeklyPlanId, setWeeklyPlanId] = useState(initial?.weeklyPlanId ?? '');
  const [weeklyGoalIndex, setWeeklyGoalIndex] = useState<string>(
    initial?.weeklyGoalIndex !== undefined ? String(initial.weeklyGoalIndex) : ''
  );
  const [goalId, setGoalId] = useState(initial?.goalId ?? '');

  const today = new Date().toISOString().split('T')[0];
  const selectedPlan = weeklyPlans.find((p) => p._id === weeklyPlanId);

  // Indices already claimed by OTHER todos on the same plan
  const claimedIndices = useMemo(() => {
    if (!weeklyPlanId) return new Set<number>();
    const claimed = new Set<number>();
    todos.forEach((t) => {
      if (
        t._id !== initial?._id &&
        t.weeklyPlanId === weeklyPlanId &&
        typeof t.weeklyGoalIndex === 'number'
      ) {
        claimed.add(t.weeklyGoalIndex);
      }
    });
    return claimed;
  }, [todos, weeklyPlanId, initial?._id]);

  const handlePlanChange = (value: string) => {
    setWeeklyPlanId(value);
    setWeeklyGoalIndex('');
  };

  const handleWeeklyGoalChange = (value: string) => {
    setWeeklyGoalIndex(value);
    if (value !== '' && selectedPlan) {
      const idx = Number(value);
      const goalText = selectedPlan.goals[idx]?.text;
      if (goalText && !title.trim()) setTitle(goalText);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const parsedIndex = weeklyGoalIndex === '' ? undefined : Number(weeklyGoalIndex);
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      ...(dueDate ? { dueDate } : {}),
      ...(weeklyPlanId ? { weeklyPlanId } : {}),
      ...(parsedIndex !== undefined ? { weeklyGoalIndex: parsedIndex } : {}),
      ...(goalId ? { goalId } : {}),
    });
  };

  const dueDayLabel = dueDate ? DAY_LABELS[new Date(dueDate).getDay()] : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          제목 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="할 일을 입력하세요"
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">우선순위</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TodoPriority)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="high">높음</option>
            <option value="medium">보통</option>
            <option value="low">낮음</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TodoStatus)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todo">할 일</option>
            <option value="doing">진행 중</option>
            <option value="done">완료</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">마감일</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            dueDate && dueDate < today ? 'border-red-300 text-red-600' : 'border-gray-300'
          }`}
        />
        <div className="flex justify-between mt-1">
          {dueDate && dueDate < today ? (
            <p className="text-xs text-red-500">마감일이 지났습니다.</p>
          ) : <span />}
          {dueDayLabel && (
            <p className="text-xs text-gray-500">주간 그리드 배치: {dueDayLabel}요일</p>
          )}
        </div>
      </div>

      {weeklyPlans.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">주간 계획 연결</label>
          <select
            value={weeklyPlanId}
            onChange={(e) => handlePlanChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">선택 안 함</option>
            {weeklyPlans.map((p) => {
              const d = new Date(p.weekStart);
              return (
                <option key={p._id} value={p._id}>
                  {d.getMonth() + 1}/{d.getDate()} 주 ({p.goals.length}개 목표)
                </option>
              );
            })}
          </select>
        </div>
      )}

      {selectedPlan && selectedPlan.goals.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            주간 목표 연동 <span className="text-xs text-gray-400 font-normal">(완료 시 주간 목표도 함께 완료)</span>
          </label>
          <select
            value={weeklyGoalIndex}
            onChange={(e) => handleWeeklyGoalChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">연동 안 함</option>
            {selectedPlan.goals.map((g, i) => {
              const isClaimed = claimedIndices.has(i);
              return (
                <option key={i} value={i} disabled={isClaimed}>
                  {g.done ? '✓ ' : ''}{g.text}{isClaimed ? ' (다른 할일에 연결됨)' : ''}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {goals.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">1년 목표 연결</label>
          <select
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">선택 안 함</option>
            {goals.map((g) => (
              <option key={g._id} value={g._id}>{g.title}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
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
