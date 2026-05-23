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
      style={{
        ...style,
        backgroundColor: '#ffffff',
        border: '1px solid #dddddd',
        borderRadius: '8px',
        padding: '12px',
        transition: `${style.transition ?? ''}, box-shadow 0.2s ease`,
      }}
      className="group"
      onMouseEnter={(e) => {
        if (!isDragging) {
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            'rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.1) 0 4px 8px 0';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing select-none"
          style={{ color: '#dddddd', fontSize: '14px', lineHeight: 1 }}
        >
          ⠿
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium leading-snug"
            style={{
              color: todo.status === 'done' ? '#929292' : '#222222',
              textDecoration: todo.status === 'done' ? 'line-through' : 'none',
            }}
          >
            {todo.title}
          </p>
          {todo.description && (
            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#929292' }}>
              {todo.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <PriorityBadge priority={todo.priority} />
            {todo.dueDate && (
              <span
                className="text-xs"
                style={{ color: isOverdue ? '#c13515' : '#929292', fontWeight: isOverdue ? 500 : 400 }}
              >
                {isOverdue ? '⚠ ' : ''}
                {new Date(todo.dueDate).toLocaleDateString('ko-KR', {
                  month: 'numeric',
                  day: 'numeric',
                })}
              </span>
            )}
            {typeof todo.weeklyGoalIndex === 'number' && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: '#fff0f3', color: '#ff385c' }}
                title="주간 목표와 연동됨"
              >
                주간목표
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(todo)}
            className="text-xs p-0.5 transition-colors"
            style={{ color: '#929292' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#222222')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#929292')}
          >
            ✏
          </button>
          <button
            onClick={() => onDelete(todo._id)}
            className="text-xs p-0.5 transition-colors"
            style={{ color: '#929292' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#c13515')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#929292')}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
