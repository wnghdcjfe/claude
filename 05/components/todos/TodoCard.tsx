'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Todo } from '@/types';
import PriorityBadge from '@/components/shared/PriorityBadge';

interface TodoCardProps {
  todo: Todo;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
}

export default function TodoCard({ todo, onEdit, onDelete }: TodoCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const today = new Date().toISOString().split('T')[0];
  const isOverdue = todo.dueDate && todo.dueDate.split('T')[0] < today && todo.status !== 'done';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-2">
        <div {...attributes} {...listeners} className="mt-0.5 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 shrink-0">
          ⠿
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${todo.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {todo.title}
          </p>
          {todo.description && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{todo.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <PriorityBadge priority={todo.priority} />
            {todo.dueDate && (
              <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                {isOverdue ? '⚠ ' : ''}
                {new Date(todo.dueDate).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
              </span>
            )}
            {typeof todo.weeklyGoalIndex === 'number' && (
              <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded" title="주간 목표와 연동됨">
                🔗 주간목표
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={() => onEdit(todo)}
            className="text-gray-300 hover:text-blue-500 text-xs p-0.5"
          >
            ✏
          </button>
          <button
            onClick={() => onDelete(todo._id)}
            className="text-gray-300 hover:text-red-500 text-xs p-0.5"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
