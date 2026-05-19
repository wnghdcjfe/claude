import LinkList from "@/components/LinkList";

const profile = {
  name: "김개발",
  bio: "풀스택 개발자 | 요즘에는 AI 개발에 관심이 많아요",
  avatarUrl: "https://placehold.co/300x300/orange/white",
};

const links = [
  { label: "GitHub", href: "https://github.com/JinseongHwang/", emoji: "🐙" },
  { label: "블로그", href: "https://jinseong-dev.tistory.com/", emoji: "✍️" },
  { label: "이메일", href: "mailto:jinseong.dev@gmail.com", emoji: "📬" },
];

export default function Home() {
  return (
    <main className="min-h-screen flex justify-center px-6 py-16 sm:py-20">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="relative">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-full bg-orange-300/40 blur-2xl"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.avatarUrl}
            alt={`${profile.name} 프로필 사진`}
            className="w-32 h-32 rounded-full object-cover ring-1 ring-white/70 shadow-[0_18px_40px_-12px_rgba(180,90,30,0.45)]"
          />
        </div>

        <h1 className="mt-7 text-2xl font-bold tracking-tight text-stone-900">
          {profile.name}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-stone-600 text-center">
          {profile.bio}
        </p>

        <LinkList links={links} />
      </div>
    </main>
  );
}
