'use client';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Todo, TodoStatus } from '@/types';
import TodoCard from './TodoCard';

const COLUMN_CONFIG: Record<
  TodoStatus,
  { label: string; accentColor: string; badgeBg: string; badgeColor: string }
> = {
  todo: {
    label: '할 일',
    accentColor: '#dddddd',
    badgeBg: '#f7f7f7',
    badgeColor: '#6a6a6a',
  },
  doing: {
    label: '진행 중',
    accentColor: '#ff385c',
    badgeBg: '#fff0f3',
    badgeColor: '#ff385c',
  },
  done: {
    label: '완료',
    accentColor: '#16a34a',
    badgeBg: '#f0fdf4',
    badgeColor: '#16a34a',
  },
};

interface KanbanColumnProps {
  status: TodoStatus;
  todos: Todo[];
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
}

export default function KanbanColumn({ status, todos, onEdit, onDelete }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const { label, accentColor, badgeBg, badgeColor } = COLUMN_CONFIG[status];

  return (
    <div
      className="flex flex-col min-h-[520px] rounded-[14px]"
      style={{ backgroundColor: '#ffffff', border: '1px solid #dddddd' }}
    >
      {/* Column header with top accent bar */}
      <div
        className="px-4 pt-4 pb-3 rounded-t-[14px] flex items-center justify-between"
        style={{ borderTop: `3px solid ${accentColor}` }}
      >
        <span className="font-semibold text-sm" style={{ color: '#222222' }}>
          {label}
        </span>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: badgeBg, color: badgeColor }}
        >
          {todos.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex-1 p-3 space-y-2 rounded-b-[14px] transition-colors"
        style={{ backgroundColor: isOver ? '#fff0f3' : 'transparent' }}
      >
        <SortableContext items={todos.map((t) => t._id)} strategy={verticalListSortingStrategy}>
          {todos.map((todo) => (
            <TodoCard key={todo._id} todo={todo} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </SortableContext>

        {todos.length === 0 && (
          <div
            className="text-center py-10 text-sm"
            style={{ color: '#dddddd' }}
          >
            여기에 드래그하세요
          </div>
        )}
      </div>
    </div>
  );
}
