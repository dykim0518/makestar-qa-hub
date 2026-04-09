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

export type StatusType =
  | "passed"
  | "failed"
  | "flaky"
  | "skipped"
  | "cancelled";

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
        dot: "bg-emerald-500",
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
      };
    case "failed":
      return {
        label: "Failed",
        dot: "bg-rose-500",
        bg: "bg-rose-50",
        text: "text-rose-700",
        border: "border-rose-200",
      };
    case "flaky":
      return {
        label: "Flaky",
        dot: "bg-amber-500",
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
      };
    case "skipped":
      return {
        label: "Skipped",
        dot: "bg-slate-400",
        bg: "bg-slate-50",
        text: "text-slate-500",
        border: "border-slate-200",
      };
    case "running":
      return {
        label: "Running",
        dot: "bg-blue-500",
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        dot: "bg-slate-400",
        bg: "bg-slate-50",
        text: "text-slate-500",
        border: "border-slate-200",
      };
    default:
      return {
        label: status,
        dot: "bg-slate-400",
        bg: "bg-slate-50",
        text: "text-slate-500",
        border: "border-slate-200",
      };
  }
}
