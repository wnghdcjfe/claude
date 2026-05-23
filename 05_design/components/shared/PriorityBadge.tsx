import { TodoPriority } from '@/types';

const config: Record<TodoPriority, { label: string; bg: string; color: string }> = {
  high: { label: '높음', bg: '#fff0f0', color: '#c13515' },
  medium: { label: '보통', bg: '#fff8ed', color: '#b45309' },
  low: { label: '낮음', bg: '#f7f7f7', color: '#6a6a6a' },
};

export default function PriorityBadge({ priority }: { priority: TodoPriority }) {
  const { label, bg, color } = config[priority];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: bg, color }}
    >
      {label}
    </span>
  );
}
