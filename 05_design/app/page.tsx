'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useStore } from '@/store';
import Header from '@/components/layout/Header';
import WeeklyGoalItem from '@/components/weekly/WeeklyGoalItem';
import ProgressBar from '@/components/weekly/ProgressBar';
import { getWeekStart } from '@/lib/utils';

const CARD_STYLE = {
  backgroundColor: '#ffffff',
  border: '1px solid #dddddd',
  borderRadius: '14px',
  padding: '20px',
};

const SECTION_TITLE_STYLE = { color: '#222222', fontWeight: 600, marginBottom: '12px' };

const LINK_STYLE = { color: '#ff385c', fontSize: '12px', textDecoration: 'none' };

export default function DashboardPage() {
  const {
    weeklyPlans,
    fetchWeeklyPlans,
    toggleWeeklyGoal,
    todos,
    fetchTodos,
    goals,
    fetchGoals,
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

  const statusCards = [
    { key: 'todo', label: '할 일', count: todoCounts.todo, bg: '#f7f7f7', color: '#6a6a6a' },
    { key: 'doing', label: '진행 중', count: todoCounts.doing, bg: '#fff0f3', color: '#ff385c' },
    { key: 'done', label: '완료', count: todoCounts.done, bg: '#f0fdf4', color: '#16a34a' },
  ] as const;

  return (
    <div>
      <Header title="대시보드" />
      <div className="p-6 space-y-4 max-w-3xl">

        {/* Weekly progress */}
        <div style={CARD_STYLE}>
          <div className="flex justify-between items-center" style={{ marginBottom: '12px' }}>
            <h3 style={SECTION_TITLE_STYLE}>이번 주 진행률</h3>
            {currentPlan ? (
              <Link href={`/weekly/${currentPlan._id}`} style={LINK_STYLE}>
                상세 보기 →
              </Link>
            ) : (
              <Link href="/weekly" style={LINK_STYLE}>
                주간 계획 만들기 →
              </Link>
            )}
          </div>
          {currentPlan ? (
            <ProgressBar value={weeklyProgress} label={`${doneGoals}/${totalGoals} 목표 완료`} />
          ) : (
            <p className="text-sm" style={{ color: '#929292' }}>
              이번 주 계획이 없습니다.
            </p>
          )}
        </div>

        {/* Weekly goals */}
        {currentPlan && currentPlan.goals.length > 0 && (
          <div style={CARD_STYLE}>
            <h3 style={SECTION_TITLE_STYLE}>이번 주 목표</h3>
            <div className="space-y-2.5">
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

        {/* Todo status */}
        <div style={CARD_STYLE}>
          <div className="flex justify-between items-center" style={{ marginBottom: '12px' }}>
            <h3 style={SECTION_TITLE_STYLE}>할 일 현황</h3>
            <Link href="/todos" style={LINK_STYLE}>
              칸반 보기 →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {statusCards.map(({ key, label, count, bg, color }) => (
              <div
                key={key}
                className="rounded-[8px] p-4 text-center"
                style={{ backgroundColor: bg }}
              >
                <p className="text-2xl font-bold" style={{ color }}>
                  {count}
                </p>
                <p className="text-xs mt-1" style={{ color }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
          {totalTodos > 0 && (
            <div className="mt-4">
              <ProgressBar
                value={Math.round((todoCounts.done / totalTodos) * 100)}
                label="전체 완료율"
              />
            </div>
          )}
        </div>

        {/* 1-year goals */}
        {goals.length > 0 && (
          <div style={CARD_STYLE}>
            <div className="flex justify-between items-center" style={{ marginBottom: '12px' }}>
              <h3 style={SECTION_TITLE_STYLE}>1년 목표</h3>
              <Link href="/goals" style={LINK_STYLE}>
                전체 보기 →
              </Link>
            </div>
            <div className="space-y-3">
              {goals.slice(0, 3).map((goal) => {
                const linked = todos.filter((t) => t.goalId === goal._id);
                const linkedDone = linked.filter((t) => t.status === 'done').length;
                return (
                  <div key={goal._id} className="flex items-center justify-between">
                    <span className="text-sm truncate flex-1" style={{ color: '#3f3f3f' }}>
                      {goal.title}
                    </span>
                    <span className="text-xs ml-3 shrink-0" style={{ color: '#929292' }}>
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
