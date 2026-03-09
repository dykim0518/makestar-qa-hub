export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getPassRate(passed: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((passed / total) * 100)}%`;
}

export function getPassRateNumber(passed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((passed / total) * 100);
}

export type StatusType = "passed" | "failed" | "flaky" | "skipped" | "cancelled";

export function getStatusConfig(status: string): {
  label: string;
  dot: string;
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case "passed":
      return {
        label: "Passed",
        dot: "bg-emerald-400",
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        border: "border-emerald-500/20",
      };
    case "failed":
      return {
        label: "Failed",
        dot: "bg-rose-400",
        bg: "bg-rose-500/10",
        text: "text-rose-400",
        border: "border-rose-500/20",
      };
    case "flaky":
      return {
        label: "Flaky",
        dot: "bg-amber-400",
        bg: "bg-amber-500/10",
        text: "text-amber-400",
        border: "border-amber-500/20",
      };
    case "skipped":
      return {
        label: "Skipped",
        dot: "bg-slate-400",
        bg: "bg-slate-500/10",
        text: "text-slate-400",
        border: "border-slate-500/20",
      };
    case "running":
      return {
        label: "Running",
        dot: "bg-indigo-400",
        bg: "bg-indigo-500/10",
        text: "text-indigo-400",
        border: "border-indigo-500/20",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        dot: "bg-slate-400",
        bg: "bg-slate-500/10",
        text: "text-slate-400",
        border: "border-slate-500/20",
      };
    default:
      return {
        label: status,
        dot: "bg-slate-400",
        bg: "bg-slate-500/10",
        text: "text-slate-400",
        border: "border-slate-500/20",
      };
  }
}
