import Link from "next/link";

type ActivePage = "dashboard" | "trigger" | "coverage" | "okr";

type AppHeaderProps = {
  active?: ActivePage;
};

export function AppHeader({ active }: AppHeaderProps) {
  const navItemBase =
    "rounded-lg px-2.5 py-2 text-xs font-semibold transition-all relative whitespace-nowrap sm:px-3.5";
  const navActive = `${navItemBase} bg-slate-100 text-slate-900 after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:w-5 after:rounded-full after:bg-slate-600`;
  const navInactive = `${navItemBase} text-[var(--muted)] hover:text-slate-900 hover:bg-slate-100`;

  return (
    <header className="bg-[var(--card)]/80 backdrop-blur-xl border-b border-[var(--card-border)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 shadow-sm">
            <svg
              className="h-5 w-5 text-slate-600"
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
          <Link
            href="/dashboard"
            className="truncate text-base font-bold text-slate-900 hover:text-slate-600 transition-colors sm:text-xl"
          >
            <span className="hidden sm:inline">Makestar </span>QA Hub
          </Link>
        </div>
        <nav
          className="flex shrink-0 items-center gap-1 text-sm sm:gap-2"
          aria-label="메인 내비게이션"
        >
          <Link
            href="/dashboard"
            className={`focus-ring ${active === "dashboard" ? navActive : navInactive}`}
            {...(active === "dashboard"
              ? { "aria-current": "page" as const }
              : {})}
          >
            대시보드
          </Link>
          <Link
            href="/trigger"
            className={`focus-ring ${active === "trigger" ? navActive : navInactive}`}
            {...(active === "trigger"
              ? { "aria-current": "page" as const }
              : {})}
          >
            테스트 실행
          </Link>
          <Link
            href="/coverage"
            className={`focus-ring ${active === "coverage" ? navActive : navInactive}`}
            {...(active === "coverage"
              ? { "aria-current": "page" as const }
              : {})}
          >
            커버리지
          </Link>
          <Link
            href="/okr"
            className={`focus-ring ${active === "okr" ? navActive : navInactive}`}
            {...(active === "okr" ? { "aria-current": "page" as const } : {})}
          >
            품질 지표
          </Link>
        </nav>
      </div>
    </header>
  );
}
