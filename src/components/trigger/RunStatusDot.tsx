export function RunStatusDot({ status }: { status: string }) {
  if (status === "running") {
    return (
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-indigo-400" />
      </span>
    );
  }
  if (status === "passed") {
    return <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />;
  }
  if (status === "failed") {
    return <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />;
  }
  return <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />;
}
