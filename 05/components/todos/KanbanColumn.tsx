'use client';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Todo, TodoStatus } from '@/types';
import TodoCard from './TodoCard';

const COLUMN_CONFIG: Record<TodoStatus, { label: string; headerClass: string }> = {
  todo: { label: '할 일', headerClass: 'bg-gray-100 text-gray-700' },
  doing: { label: '진행 중', headerClass: 'bg-blue-100 text-blue-700' },
  done: { label: '완료', headerClass: 'bg-green-100 text-green-700' },
};

interface KanbanColumnProps {
  status: TodoStatus;
  todos: Todo[];
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
}

export default function KanbanColumn({ status, todos, onEdit, onDelete }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const { label, headerClass } = COLUMN_CONFIG[status];

  return (
    <div className="flex flex-col bg-gray-50 rounded-xl min-h-[500px]">
      <div className={`px-4 py-3 rounded-t-xl flex items-center justify-between ${headerClass}`}>
        <span className="font-semibold text-sm">{label}</span>
        <span className="text-xs font-medium opacity-70">{todos.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 p-3 space-y-2 transition-colors rounded-b-xl ${isOver ? 'bg-blue-50' : ''}`}
      >
        <SortableContext items={todos.map((t) => t._id)} strategy={verticalListSortingStrategy}>
          {todos.map((todo) => (
            <TodoCard key={todo._id} todo={todo} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </SortableContext>
        {todos.length === 0 && (
          <div className="text-center py-8 text-gray-300 text-sm">
            여기에 드래그하세요
          </div>
        )}
      </div>
    </div>
  );
}
