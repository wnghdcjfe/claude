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
    <div className="grid grid-cols-7 gap-2">
      {DAYS.map((day, i) => (
        <div key={day} className="min-h-[120px]">
          <div className="text-center text-xs font-medium text-gray-500 mb-2 pb-1 border-b border-gray-200">
            {day}
          </div>
          <div className="space-y-1">
            {todosByDay[i].map((todo) => (
              <div
                key={todo._id}
                className={`text-xs p-1.5 rounded truncate ${
                  todo.status === 'done'
                    ? 'bg-green-100 text-green-700 line-through'
                    : 'bg-blue-50 text-blue-700'
                }`}
              >
                {todo.title}
              </div>
            ))}
            {onDayClick && (
              <button
                onClick={() => onDayClick(i)}
                className="w-full text-xs text-gray-400 hover:text-blue-500 py-1 rounded hover:bg-blue-50 transition-colors"
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
