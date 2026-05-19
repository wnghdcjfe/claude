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
          <p className="text-gray-500 text-sm">{goals.length}개의 목표</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            + 새 목표
          </button>
        </div>

        {goalsLoading ? (
          <div className="text-center py-12 text-gray-400">불러오는 중...</div>
        ) : goals.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🎯</p>
            <p>아직 목표가 없습니다. 첫 번째 목표를 추가해보세요!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => (
              <GoalCard key={goal._id} goal={goal} onEdit={handleEdit} onDelete={deleteGoal} />
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleClose} title={editingGoal ? '목표 수정' : '새 목표 추가'}>
        <GoalForm initial={editingGoal ?? undefined} onSubmit={handleSubmit} onCancel={handleClose} />
      </Modal>
    </div>
  );
}
