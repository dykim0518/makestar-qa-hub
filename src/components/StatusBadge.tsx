import { getStatusConfig } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  const config = getStatusConfig(status);
  const isRunning = status === "running";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${isRunning ? "font-bold shadow-sm shadow-emerald-500/30" : "font-semibold"} ${config.bg} ${config.text} ${config.border}`}
    >
      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
