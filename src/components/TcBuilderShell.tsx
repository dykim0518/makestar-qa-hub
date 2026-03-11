import Link from "next/link";
import type { ReactNode } from "react";

interface TcBuilderShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function TcBuilderShell({ title, subtitle, children }: TcBuilderShellProps) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
              <svg
                className="h-4 w-4 text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
                />
              </svg>
            </div>
            <Link href="/dashboard" className="text-lg font-bold text-white hover:text-indigo-400 transition-colors">
              Makestar QA Dashboard
            </Link>
          </div>
          <nav className="flex gap-2 text-sm">
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-white"
            >
              대시보드
            </Link>
            <Link
              href="/trigger"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-white"
            >
              테스트 실행
            </Link>
            <Link
              href="/tc"
              className="rounded-lg bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-400"
            >
              TC Builder
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">{subtitle}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
