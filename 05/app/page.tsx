'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useStore } from '@/store';
import Header from '@/components/layout/Header';
import WeeklyGoalItem from '@/components/weekly/WeeklyGoalItem';
import ProgressBar from '@/components/weekly/ProgressBar';
import { getWeekStart } from '@/lib/utils';

export default function DashboardPage() {
  const {
    weeklyPlans, fetchWeeklyPlans, toggleWeeklyGoal,
    todos, fetchTodos,
    goals, fetchGoals,
  } = useStore();

  useEffect(() => {
    fetchWeeklyPlans();
    fetchTodos();
    fetchGoals();
  }, [fetchWeeklyPlans, fetchTodos, fetchGoals]);

  const thisWeekStart = getWeekStart(new Date()).toISOString().split('T')[0];
  const currentPlan = weeklyPlans.find((p) => {
    const ps = new Date(p.weekStart).toISOString().split('T')[0];
    return ps === thisWeekStart;
  });

  const todoCounts = {
    todo: todos.filter((t) => t.status === 'todo').length,
    doing: todos.filter((t) => t.status === 'doing').length,
    done: todos.filter((t) => t.status === 'done').length,
  };
  const totalTodos = todos.length;

  const doneGoals = currentPlan?.goals.filter((g) => g.done).length ?? 0;
  const totalGoals = currentPlan?.goals.length ?? 0;
  const weeklyProgress = totalGoals > 0 ? Math.round((doneGoals / totalGoals) * 100) : 0;

  return (
    <div>
      <Header title="대시보드" />
      <div className="p-6 space-y-6">

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-800">이번 주 진행률</h3>
            {currentPlan ? (
              <Link href={`/weekly/${currentPlan._id}`} className="text-xs text-blue-600 hover:underline">
                상세 보기 →
              </Link>
            ) : (
              <Link href="/weekly" className="text-xs text-blue-600 hover:underline">
                주간 계획 만들기 →
              </Link>
            )}
          </div>
          {currentPlan ? (
            <ProgressBar value={weeklyProgress} label={`${doneGoals}/${totalGoals} 목표 완료`} />
          ) : (
            <p className="text-sm text-gray-400">이번 주 계획이 없습니다.</p>
          )}
        </div>

        {currentPlan && currentPlan.goals.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-3">이번 주 목표</h3>
            <div className="space-y-2">
              {currentPlan.goals.map((goal, i) => (
                <WeeklyGoalItem
                  key={i}
                  text={goal.text}
                  done={goal.done}
                  onToggle={() => toggleWeeklyGoal(currentPlan._id, i)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-800">할 일 현황</h3>
            <Link href="/todos" className="text-xs text-blue-600 hover:underline">칸반 보기 →</Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {([
              { key: 'todo', label: '할 일', count: todoCounts.todo, color: 'bg-gray-100 text-gray-700' },
              { key: 'doing', label: '진행 중', count: todoCounts.doing, color: 'bg-blue-100 text-blue-700' },
              { key: 'done', label: '완료', count: todoCounts.done, color: 'bg-green-100 text-green-700' },
            ] as const).map(({ key, label, count, color }) => (
              <div key={key} className={`rounded-lg p-4 text-center ${color}`}>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
          {totalTodos > 0 && (
            <div className="mt-3">
              <ProgressBar
                value={Math.round((todoCounts.done / totalTodos) * 100)}
                label="전체 완료율"
              />
            </div>
          )}
        </div>

        {goals.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-800">1년 목표</h3>
              <Link href="/goals" className="text-xs text-blue-600 hover:underline">전체 보기 →</Link>
            </div>
            <div className="space-y-3">
              {goals.slice(0, 3).map((goal) => {
                const linked = todos.filter((t) => t.goalId === goal._id);
                const linkedDone = linked.filter((t) => t.status === 'done').length;
                return (
                  <div key={goal._id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 truncate flex-1">{goal.title}</span>
                    <span className="text-xs text-gray-400 ml-3 shrink-0">
                      {linkedDone}/{linked.length} 할 일
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
