'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/', label: '대시보드', icon: '🏠' },
  { href: '/todos', label: '할 일', icon: '✅' },
  { href: '/weekly', label: '주간 계획', icon: '📅' },
  { href: '/goals', label: '1년 목표', icon: '🎯' },
];

interface CurrentUser {
  _id: string;
  username: string;
  avatarUrl: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold">할일 + 계획</h1>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map(({ href, label, icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  pathname === href
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {user && (
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.username}
                width={36}
                height={36}
                className="rounded-full"
                unoptimized
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-sm">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.username}</p>
              <p className="text-xs text-gray-400">GitHub</p>
            </div>
          </div>
          <a
            href="/api/auth/logout"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            로그아웃
          </a>
        </div>
      )}
    </aside>
  );
}
