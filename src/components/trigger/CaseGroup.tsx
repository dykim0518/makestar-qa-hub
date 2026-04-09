import type { TestCaseResult } from "@/lib/types/trigger";

export function CaseGroup({
  label,
  count,
  dotColor,
  cases,
}: {
  label: string;
  count: number;
  dotColor: string;
  cases: TestCaseResult[];
}) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 px-1 py-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          {label}
        </span>
        <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-[var(--muted)]">
          {count}
        </span>
      </div>
      {cases.map((tc) => (
        <CaseRow key={tc.id} tc={tc} />
      ))}
    </div>
  );
}

function CaseRow({ tc }: { tc: TestCaseResult }) {
  const statusConfig: Record<string, { dot: string; text: string }> = {
    passed: { dot: "bg-emerald-400", text: "text-emerald-400" },
    failed: { dot: "bg-rose-400", text: "text-rose-400" },
    flaky: { dot: "bg-amber-400", text: "text-amber-400" },
    skipped: { dot: "bg-slate-400", text: "text-slate-400" },
  };
  const config = statusConfig[tc.status] || statusConfig.skipped;

  const idMatch = tc.title.match(/^([A-Z]+-[A-Z]+-\d+):\s*(.+)$/);
  const durationSec = (tc.durationMs / 1000).toFixed(1);

  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.02]">
      <span className={`h-2 w-2 shrink-0 rounded-full ${config.dot}`} />
      <div className="min-w-0 flex-1">
        {idMatch ? (
          <p className="text-xs truncate">
            <span className={`font-mono font-semibold ${config.text}`}>
              {idMatch[1]}
            </span>
            <span className="text-slate-400 ml-1">{idMatch[2]}</span>
          </p>
        ) : (
          <p className="text-xs text-slate-300 truncate">{tc.title}</p>
        )}
      </div>
      <span className="shrink-0 text-[10px] font-mono text-[var(--muted)]">
        {durationSec}s
      </span>
    </div>
  );
}
