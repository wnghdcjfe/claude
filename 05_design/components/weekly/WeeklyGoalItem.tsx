'use client';

interface WeeklyGoalItemProps {
  text: string;
  done: boolean;
  onToggle: () => void;
}

export default function WeeklyGoalItem({ text, done, onToggle }: WeeklyGoalItemProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={done}
        onChange={onToggle}
        className="mt-0.5 h-4 w-4 rounded"
        style={{ accentColor: '#ff385c' }}
      />
      <span
        className="text-sm leading-relaxed"
        style={{
          color: done ? '#929292' : '#3f3f3f',
          textDecoration: done ? 'line-through' : 'none',
        }}
      >
        {text}
      </span>
    </label>
  );
}
