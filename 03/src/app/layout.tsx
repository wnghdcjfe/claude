import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "링크나무",
  description: "한 페이지에 모은 나의 모든 링크",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
