'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { Goal } from '@/types';
import Header from '@/components/layout/Header';
import GoalCard from '@/components/goals/GoalCard';
import GoalForm from '@/components/goals/GoalForm';
import Modal from '@/components/shared/Modal';

export default function GoalsPage() {
  const { goals, goalsLoading, fetchGoals, addGoal, updateGoal, deleteGoal } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleSubmit = async (data: { title: string; description: string }) => {
    if (editingGoal) {
      await updateGoal(editingGoal._id, data);
    } else {
      await addGoal(data);
    }
    setIsModalOpen(false);
    setEditingGoal(null);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingGoal(null);
  };

  return (
    <div>
      <Header title="1년 목표" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm" style={{ color: '#6a6a6a' }}>
            {goals.length}개의 목표
          </p>
          <button onClick={() => setIsModalOpen(true)} className="btn-rausch">
            + 새 목표
          </button>
        </div>

        {goalsLoading ? (
          <div className="text-center py-16" style={{ color: '#929292' }}>
            불러오는 중...
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-16">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: '#fff0f3' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff385c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: '#222222' }}>
              아직 목표가 없습니다
            </p>
            <p className="text-sm" style={{ color: '#929292' }}>
              첫 번째 1년 목표를 추가해보세요.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => (
              <GoalCard key={goal._id} goal={goal} onEdit={handleEdit} onDelete={deleteGoal} />
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        title={editingGoal ? '목표 수정' : '새 목표 추가'}
      >
        <GoalForm initial={editingGoal ?? undefined} onSubmit={handleSubmit} onCancel={handleClose} />
      </Modal>
    </div>
  );
}
