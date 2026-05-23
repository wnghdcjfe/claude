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
      <div className="ab-card rounded-[14px] p-5 cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-xs mb-0.5" style={{ color: '#929292' }}>
              주간 계획
            </p>
            <h3 className="font-semibold" style={{ color: '#222222' }}>
              {fmt(weekStart)} ~ {fmt(weekEnd)}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleEdit}
              className="p-1.5 rounded-[6px] transition-colors text-sm"
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
              className="p-1.5 rounded-[6px] transition-colors text-sm"
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

        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
          style={{ backgroundColor: '#fff0f3', color: '#ff385c' }}
        >
          {doneCount}/{plan.goals.length} 완료
        </span>

        {plan.goals.length > 0 && (
          <div className="mt-3">
            <ProgressBar value={progress} showPercent={true} />
          </div>
        )}

        {plan.goals.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {plan.goals.slice(0, 3).map((g, i) => (
              <li
                key={i}
                className="text-xs flex items-center gap-1.5"
                style={{
                  color: g.done ? '#929292' : '#3f3f3f',
                  textDecoration: g.done ? 'line-through' : 'none',
                }}
              >
                <span style={{ color: g.done ? '#ff385c' : '#dddddd' }}>
                  {g.done ? '✓' : '○'}
                </span>
                {g.text}
              </li>
            ))}
            {plan.goals.length > 3 && (
              <li className="text-xs" style={{ color: '#929292' }}>
                +{plan.goals.length - 3}개 더
              </li>
            )}
          </ul>
        )}
      </div>
    </Link>
  );
}
