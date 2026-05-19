'use client';
import Link from 'next/link';
import { WeeklyPlan } from '@/types';
import ProgressBar from './ProgressBar';

interface WeeklyPlanCardProps {
  plan: WeeklyPlan;
  onEdit: (plan: WeeklyPlan) => void;
  onDelete: (id: string) => void;
}

export default function WeeklyPlanCard({ plan, onEdit, onDelete }: WeeklyPlanCardProps) {
  const doneCount = plan.goals.filter((g) => g.done).length;
  const progress = plan.goals.length > 0 ? Math.round((doneCount / plan.goals.length) * 100) : 0;
  const weekStart = new Date(plan.weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('이 주간 계획을 삭제하시겠습니까?')) onDelete(plan._id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit(plan);
  };

  return (
    <Link href={`/weekly/${plan._id}`}>
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">주간 계획</p>
            <h3 className="font-semibold text-gray-900">
              {fmt(weekStart)} ~ {fmt(weekEnd)}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleEdit}
              className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
              title="수정"
            >
              ✏️
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
              title="삭제"
            >
              🗑️
            </button>
          </div>
        </div>

        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
          {doneCount}/{plan.goals.length} 완료
        </span>

        {plan.goals.length > 0 && (
          <div className="mt-3">
            <ProgressBar value={progress} showPercent={true} />
          </div>
        )}

        {plan.goals.length > 0 && (
          <ul className="mt-3 space-y-1">
            {plan.goals.slice(0, 3).map((g, i) => (
              <li key={i} className={`text-xs flex items-center gap-1.5 ${g.done ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                <span>{g.done ? '✓' : '○'}</span>
                {g.text}
              </li>
            ))}
            {plan.goals.length > 3 && (
              <li className="text-xs text-gray-400">+{plan.goals.length - 3}개 더</li>
            )}
          </ul>
        )}
      </div>
    </Link>
  );
}
