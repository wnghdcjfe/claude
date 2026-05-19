'use client';
import { formatDate } from '@/lib/utils';

export default function Header({ title }: { title: string }) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <span className="text-sm text-gray-500">{formatDate(new Date())}</span>
    </header>
  );
}
