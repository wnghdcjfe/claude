import { TodoPriority } from '@/types';

const config: Record<TodoPriority, { label: string; className: string }> = {
  high: { label: '높음', className: 'bg-red-100 text-red-700' },
  medium: { label: '보통', className: 'bg-yellow-100 text-yellow-700' },
  low: { label: '낮음', className: 'bg-gray-100 text-gray-500' },
};

export default function PriorityBadge({ priority }: { priority: TodoPriority }) {
  const { label, className } = config[priority];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
