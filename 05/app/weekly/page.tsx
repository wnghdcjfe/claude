'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { WeeklyPlan } from '@/types';
import Header from '@/components/layout/Header';
import WeeklyPlanCard from '@/components/weekly/WeeklyPlanCard';
import WeeklyPlanForm from '@/components/weekly/WeeklyPlanForm';
import Modal from '@/components/shared/Modal';

export default function WeeklyPage() {
  const { weeklyPlans, weeklyLoading, fetchWeeklyPlans, addWeeklyPlan, updateWeeklyPlan, deleteWeeklyPlan, goals, fetchGoals } = useStore();
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
          <p className="text-sm text-gray-500">최근 {recent.length}개 주간 계획</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            + 새 주간 계획
          </button>
        </div>

        {weeklyLoading ? (
          <div className="text-center py-12 text-gray-400">불러오는 중...</div>
        ) : recent.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">📅</p>
            <p>아직 주간 계획이 없습니다.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
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

      <Modal isOpen={isModalOpen} onClose={handleClose} title={editingPlan ? '주간 계획 수정' : '새 주간 계획'}>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
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
