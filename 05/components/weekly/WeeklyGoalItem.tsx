'use client';

interface WeeklyGoalItemProps {
  text: string;
  done: boolean;
  onToggle: () => void;
}

export default function WeeklyGoalItem({ text, done, onToggle }: WeeklyGoalItemProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <input
        type="checkbox"
        checked={done}
        onChange={onToggle}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <span className={`text-sm leading-relaxed ${done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
        {text}
      </span>
    </label>
  );
}
