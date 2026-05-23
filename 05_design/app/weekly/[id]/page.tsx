'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useStore } from '@/store';
import Header from '@/components/layout/Header';
import WeeklyGoalItem from '@/components/weekly/WeeklyGoalItem';
import WeekGrid from '@/components/weekly/WeekGrid';
import ProgressBar from '@/components/weekly/ProgressBar';

const CARD = {
  backgroundColor: '#ffffff',
  border: '1px solid #dddddd',
  borderRadius: '14px',
  padding: '20px',
};

export default function WeeklyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    currentWeeklyPlan,
    fetchWeeklyPlan,
    toggleWeeklyGoal,
    updateWeeklyPlan,
    todos,
    fetchTodos,
  } = useStore();
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
        <div className="p-6 text-center" style={{ color: '#929292' }}>
          불러오는 중...
        </div>
      </div>
    );
  }

  const weekStart = new Date(currentWeeklyPlan.weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  const doneCount = currentWeeklyPlan.goals.filter((g) => g.done).length;
  const progress =
    currentWeeklyPlan.goals.length > 0
      ? Math.round((doneCount / currentWeeklyPlan.goals.length) * 100)
      : 0;

  const sectionTitle = { color: '#222222', fontWeight: 600, marginBottom: '12px' };
  const labelStyle = { color: '#6a6a6a', fontSize: '12px', fontWeight: 500, marginBottom: '6px', display: 'block' };

  return (
    <div>
      <Header title={`${fmt(weekStart)} ~ ${fmt(weekEnd)} 주간 계획`} />
      <div className="p-6 space-y-4 max-w-4xl">

        {/* Progress */}
        <div style={CARD}>
          <h3 style={sectionTitle}>주간 진행률</h3>
          <ProgressBar
            value={progress}
            label={`${doneCount}/${currentWeeklyPlan.goals.length} 완료`}
          />
        </div>

        {/* Weekly goals */}
        <div style={CARD}>
          <h3 style={sectionTitle}>이번 주 목표</h3>
          {currentWeeklyPlan.goals.length === 0 ? (
            <p className="text-sm" style={{ color: '#929292' }}>
              등록된 목표가 없습니다.
            </p>
          ) : (
            <div className="space-y-2.5">
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

        {/* Week grid */}
        <div style={CARD}>
          <h3 style={{ ...sectionTitle, marginBottom: '16px' }}>요일별 할 일</h3>
          <WeekGrid todos={todos} />
        </div>

        {/* Memo & retrospective */}
        <div style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ ...sectionTitle, marginBottom: 0 }}>메모 &amp; 회고</h3>

          <div>
            <label style={labelStyle}>메모</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              className="ab-input"
            />
          </div>

          <div>
            <label style={labelStyle}>주간 회고</label>
            <textarea
              value={retrospective}
              onChange={(e) => setRetrospective(e.target.value)}
              rows={4}
              placeholder="이번 주를 돌아보며..."
              className="ab-input"
            />
          </div>

          <div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-rausch"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
