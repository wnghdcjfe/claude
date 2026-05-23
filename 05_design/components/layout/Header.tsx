'use client';
import { formatDate } from '@/lib/utils';

export default function Header({ title }: { title: string }) {
  return (
    <header
      className="px-6 py-4 flex items-center justify-between"
      style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #dddddd',
      }}
    >
      <h2 className="text-xl font-semibold" style={{ color: '#222222' }}>
        {title}
      </h2>
      <span className="text-sm" style={{ color: '#6a6a6a' }}>
        {formatDate(new Date())}
      </span>
    </header>
  );
}
