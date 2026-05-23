'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { WeeklyPlan } from '@/types';
import Header from '@/components/layout/Header';
import WeeklyPlanCard from '@/components/weekly/WeeklyPlanCard';
import WeeklyPlanForm from '@/components/weekly/WeeklyPlanForm';
import Modal from '@/components/shared/Modal';

export default function WeeklyPage() {
  const {
    weeklyPlans,
    weeklyLoading,
    fetchWeeklyPlans,
    addWeeklyPlan,
    updateWeeklyPlan,
    deleteWeeklyPlan,
    goals,
    fetchGoals,
  } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WeeklyPlan | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWeeklyPlans();
    fetchGoals();
  }, [fetchWeeklyPlans, fetchGoals]);

  const recent = weeklyPlans.slice(0, 4);

  const handleSubmit = async (data: Parameters<typeof addWeeklyPlan>[0]) => {
    try {
      setError('');
      if (editingPlan) {
        await updateWeeklyPlan(editingPlan._id, data);
      } else {
        await addWeeklyPlan(data);
      }
      handleClose();
    } catch {
      setError('이미 해당 주의 계획이 존재합니다.');
    }
  };

  const handleEdit = (plan: WeeklyPlan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteWeeklyPlan(id);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
    setError('');
  };

  return (
    <div>
      <Header title="주간 계획" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm" style={{ color: '#6a6a6a' }}>
            최근 {recent.length}개 주간 계획
          </p>
          <button onClick={() => setIsModalOpen(true)} className="btn-rausch">
            + 새 주간 계획
          </button>
        </div>

        {weeklyLoading ? (
          <div className="text-center py-16" style={{ color: '#929292' }}>
            불러오는 중...
          </div>
        ) : recent.length === 0 ? (
          <div className="text-center py-16">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: '#fff0f3' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff385c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: '#222222' }}>
              아직 주간 계획이 없습니다
            </p>
            <p className="text-sm" style={{ color: '#929292' }}>
              이번 주 계획을 세워보세요.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {recent.map((plan) => (
              <WeeklyPlanCard
                key={plan._id}
                plan={plan}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        title={editingPlan ? '주간 계획 수정' : '새 주간 계획'}
      >
        {error && (
          <p className="text-sm mb-3" style={{ color: '#c13515' }}>
            {error}
          </p>
        )}
        <WeeklyPlanForm
          goals={goals}
          initial={editingPlan ?? undefined}
          onSubmit={handleSubmit}
          onCancel={handleClose}
        />
      </Modal>
    </div>
  );
}
