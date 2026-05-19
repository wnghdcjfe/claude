'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { Todo } from '@/types';
import Header from '@/components/layout/Header';
import Modal from '@/components/shared/Modal';
import TodoForm from '@/components/todos/TodoForm';

const KanbanBoard = dynamic(() => import('@/components/todos/KanbanBoard'), { ssr: false });

export default function TodosPage() {
  const { todos, fetchTodos, addTodo, updateTodo, goals, fetchGoals, weeklyPlans, fetchWeeklyPlans } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  useEffect(() => {
    fetchTodos();
    fetchGoals();
    fetchWeeklyPlans();
  }, [fetchTodos, fetchGoals, fetchWeeklyPlans]);

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: Parameters<typeof addTodo>[0]) => {
    if (editingTodo) {
      await updateTodo(editingTodo._id, data);
    } else {
      await addTodo(data);
    }
    setIsModalOpen(false);
    setEditingTodo(null);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingTodo(null);
  };

  return (
    <div>
      <Header title="칸반 보드" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-500">전체 {todos.length}개</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            + 새 할 일
          </button>
        </div>

        <KanbanBoard onEdit={handleEdit} />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        title={editingTodo ? '할 일 수정' : '새 할 일'}
      >
        <TodoForm
          goals={goals}
          weeklyPlans={weeklyPlans}
          todos={todos}
          initial={editingTodo ?? undefined}
          onSubmit={handleSubmit}
          onCancel={handleClose}
        />
      </Modal>
    </div>
  );
}
