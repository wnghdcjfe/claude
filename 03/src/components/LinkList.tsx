"use client";

import { useEffect, useState } from "react";

type Link = {
  label: string;
  href: string;
  emoji: string;
};

export default function LinkList({ links }: { links: Link[] }) {
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(links.map((l) => [l.href, 0]))
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/clicks")
      .then((res) => res.json())
      .then((data: { counts: Record<string, number> }) => {
        if (cancelled) return;
        setCounts((prev) => ({ ...prev, ...data.counts }));
      })
      .catch(() => {
        // 네트워크 실패 시 0회 유지
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClick = (href: string) => {
    setCounts((prev) => ({ ...prev, [href]: (prev[href] ?? 0) + 1 }));
    fetch("/api/clicks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ href }),
      keepalive: true,
    }).catch(() => {
      // 전송 실패는 조용히 무시
    });
  };

  return (
    <ul className="mt-12 w-full flex flex-col gap-4">
      {links.map((link) => (
        <li key={link.label}>
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleClick(link.href)}
            className="group flex items-center justify-center gap-2 w-full rounded-2xl border border-white/60 bg-white/55 backdrop-blur-md py-4 px-5 text-[15px] font-medium text-stone-800 shadow-[0_8px_24px_-12px_rgba(120,70,30,0.25)] transition duration-200 ease-out hover:bg-white/75 hover:-translate-y-[1px] hover:shadow-[0_12px_28px_-12px_rgba(120,70,30,0.35)] relative"
          >
            <span className="text-base">{link.emoji}</span>
            <span>{link.label}</span>
            <span className="absolute right-5 text-xs text-stone-500">
              {counts[link.href] ?? 0}회
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
