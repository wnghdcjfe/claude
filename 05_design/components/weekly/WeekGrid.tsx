'use client';
import { Todo } from '@/types';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

interface WeekGridProps {
  todos: Todo[];
  onDayClick?: (dayIndex: number) => void;
}

export default function WeekGrid({ todos, onDayClick }: WeekGridProps) {
  const todosByDay = DAYS.map((_, i) =>
    todos.filter((t) => t.dayOfWeek === (i + 1) % 7)
  );

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {DAYS.map((day, i) => (
        <div key={day} className="min-h-[120px]">
          <div
            className="text-center text-xs font-medium mb-2 pb-1.5"
            style={{
              color: '#6a6a6a',
              borderBottom: '1px solid #ebebeb',
            }}
          >
            {day}
          </div>
          <div className="space-y-1">
            {todosByDay[i].map((todo) => (
              <div
                key={todo._id}
                className="text-xs px-1.5 py-1 rounded-[6px] truncate"
                style={
                  todo.status === 'done'
                    ? { backgroundColor: '#f0fdf4', color: '#16a34a', textDecoration: 'line-through' }
                    : { backgroundColor: '#fff0f3', color: '#ff385c' }
                }
              >
                {todo.title}
              </div>
            ))}
            {onDayClick && (
              <button
                onClick={() => onDayClick(i)}
                className="w-full text-xs py-1 rounded-[6px] transition-colors"
                style={{ color: '#929292' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f7f7f7';
                  (e.currentTarget as HTMLButtonElement).style.color = '#ff385c';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = '#929292';
                }}
              >
                + 추가
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
