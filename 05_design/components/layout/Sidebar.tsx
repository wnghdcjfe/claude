'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const navItems = [
  {
    href: '/',
    label: '대시보드',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/todos',
    label: '할 일',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    href: '/weekly',
    label: '주간 계획',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    href: '/goals',
    label: '1년 목표',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
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
    <aside
      className="w-56 min-h-screen flex flex-col shrink-0"
      style={{ backgroundColor: '#ffffff', borderRight: '1px solid #dddddd' }}
    >
      {/* Brand */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid #ebebeb' }}>
        <span className="text-lg font-bold tracking-tight" style={{ color: '#ff385c' }}>
          할일 + 계획
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm font-medium ${
                    isActive ? 'nav-item-active' : 'nav-item'
                  }`}
                >
                  {icon}
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User */}
      {user && (
        <div className="px-4 py-4" style={{ borderTop: '1px solid #dddddd' }}>
          <div className="flex items-center gap-2.5 mb-3">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.username}
                width={30}
                height={30}
                className="rounded-full shrink-0"
                unoptimized
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
                style={{ backgroundColor: '#ff385c' }}
              >
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#222222' }}>
                {user.username}
              </p>
              <p className="text-xs" style={{ color: '#929292' }}>
                GitHub
              </p>
            </div>
          </div>
          <a
            href="/api/auth/logout"
            className="logout-btn flex items-center justify-center w-full px-3 py-2 text-sm"
          >
            로그아웃
          </a>
        </div>
      )}
    </aside>
  );
}
