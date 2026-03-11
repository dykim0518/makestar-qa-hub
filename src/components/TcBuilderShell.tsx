import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";

interface TcBuilderShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function TcBuilderShell({ title, subtitle, children }: TcBuilderShellProps) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AppHeader active="tc" />

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
