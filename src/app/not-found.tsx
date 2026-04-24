"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)] px-4 text-white">
      <div className="text-center">
        <p className="text-7xl font-bold text-sky-400 sm:text-8xl">404</p>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">找不到此頁面</h1>
        <p className="mt-3 text-base text-white/70">
          您要找的頁面不存在或已被移除
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-500 hover:shadow-xl"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          回到首頁
        </Link>
      </div>
    </main>
  );
}
