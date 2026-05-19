'use client';
import { Goal } from '@/types';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
}

export default function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const handleDelete = () => {
    if (confirm(`"${goal.title}" 목표를 삭제하시겠습니까?`)) {
      onDelete(goal._id);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{goal.title}</h3>
          {goal.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{goal.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(goal)}
            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            title="수정"
          >
            ✏️
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
            title="삭제"
          >
            🗑️
          </button>
        </div>
      </div>
      {goal.progress > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>진행률</span>
            <span>{goal.progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all"
              style={{ width: `${goal.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
