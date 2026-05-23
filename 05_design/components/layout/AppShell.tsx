'use client';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/login') return <>{children}</>;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#f7f7f7' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
