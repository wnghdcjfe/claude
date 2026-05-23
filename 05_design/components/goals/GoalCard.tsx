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
    <div className="ab-card rounded-[14px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate" style={{ color: '#222222' }}>
            {goal.title}
          </h3>
          {goal.description && (
            <p className="text-sm mt-1 line-clamp-2" style={{ color: '#6a6a6a' }}>
              {goal.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(goal)}
            className="p-1.5 rounded-[6px] text-sm transition-colors"
            style={{ color: '#929292' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f7f7f7';
              (e.currentTarget as HTMLButtonElement).style.color = '#222222';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = '#929292';
            }}
            title="수정"
          >
            ✏
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-[6px] text-sm transition-colors"
            style={{ color: '#929292' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff0f0';
              (e.currentTarget as HTMLButtonElement).style.color = '#c13515';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = '#929292';
            }}
            title="삭제"
          >
            ✕
          </button>
        </div>
      </div>

      {goal.progress > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span style={{ color: '#6a6a6a' }}>진행률</span>
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
      )}
    </div>
  );
}
