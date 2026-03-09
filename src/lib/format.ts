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

export function getStatusColor(status: string): string {
  switch (status) {
    case "passed":
      return "text-green-600 bg-green-50";
    case "failed":
      return "text-red-600 bg-red-50";
    case "flaky":
      return "text-yellow-600 bg-yellow-50";
    case "skipped":
      return "text-gray-500 bg-gray-50";
    case "cancelled":
      return "text-gray-500 bg-gray-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
}
