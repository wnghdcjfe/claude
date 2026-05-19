'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useStore } from '@/store';
import Header from '@/components/layout/Header';
import WeeklyGoalItem from '@/components/weekly/WeeklyGoalItem';
import WeekGrid from '@/components/weekly/WeekGrid';
import ProgressBar from '@/components/weekly/ProgressBar';

export default function WeeklyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { currentWeeklyPlan, fetchWeeklyPlan, toggleWeeklyGoal, updateWeeklyPlan, todos, fetchTodos } = useStore();
  const [memo, setMemo] = useState('');
  const [retrospective, setRetrospective] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchWeeklyPlan(id);
      fetchTodos({ weeklyPlanId: id });
    }
  }, [id, fetchWeeklyPlan, fetchTodos]);

  useEffect(() => {
    if (currentWeeklyPlan) {
      setMemo(currentWeeklyPlan.memo ?? '');
      setRetrospective(currentWeeklyPlan.retrospective ?? '');
    }
  }, [currentWeeklyPlan]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    await updateWeeklyPlan(id, { memo, retrospective });
    setSaving(false);
  };

  if (!currentWeeklyPlan) {
    return (
      <div>
        <Header title="주간 계획" />
        <div className="p-6 text-center text-gray-400">불러오는 중...</div>
      </div>
    );
  }

  const weekStart = new Date(currentWeeklyPlan.weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  const doneCount = currentWeeklyPlan.goals.filter((g) => g.done).length;
  const progress = currentWeeklyPlan.goals.length > 0
    ? Math.round((doneCount / currentWeeklyPlan.goals.length) * 100)
    : 0;

  return (
    <div>
      <Header title={`${fmt(weekStart)} ~ ${fmt(weekEnd)} 주간 계획`} />
      <div className="p-6 space-y-6">

        {/* 진행률 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-3">주간 진행률</h3>
          <ProgressBar value={progress} label={`${doneCount}/${currentWeeklyPlan.goals.length} 완료`} />
        </div>

        {/* 주간 목표 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-3">이번 주 목표</h3>
          {currentWeeklyPlan.goals.length === 0 ? (
            <p className="text-sm text-gray-400">등록된 목표가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {currentWeeklyPlan.goals.map((goal, i) => (
                <WeeklyGoalItem
                  key={i}
                  text={goal.text}
                  done={goal.done}
                  onToggle={() => toggleWeeklyGoal(id, i)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 요일별 할일 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">요일별 할 일</h3>
          <WeekGrid todos={todos} />
        </div>

        {/* 메모 & 회고 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">메모 & 회고</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">주간 회고</label>
            <textarea
              value={retrospective}
              onChange={(e) => setRetrospective(e.target.value)}
              rows={4}
              placeholder="이번 주를 돌아보며..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>

      </div>
    </div>
  );
}
