"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CoverageFeatureRow } from "@/app/coverage/page";

type Props = { feature: CoverageFeatureRow };

const PRIORITIES: CoverageFeatureRow["priority"][] = [
  "critical",
  "high",
  "medium",
  "low",
];

export function FeatureEditor({ feature }: Props) {
  const router = useRouter();
  const [priority, setPriority] = useState(feature.priority);
  const [tag, setTag] = useState(feature.tag ?? "");
  const [notes, setNotes] = useState(feature.notes ?? "");
  const [isActive, setIsActive] = useState(true); // 현재 UI는 active만 노출
  const [state, setState] = useState<"idle" | "saving" | "ok" | "err">("idle");
  const [err, setErr] = useState<string | null>(null);

  const dirty =
    priority !== feature.priority ||
    (tag || "") !== (feature.tag ?? "") ||
    (notes || "") !== (feature.notes ?? "") ||
    !isActive;

  async function save() {
    setState("saving");
    setErr(null);
    try {
      const res = await fetch(`/api/coverage/features/${feature.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priority,
          tag: tag.trim() || null,
          notes: notes.trim() || null,
          isActive,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setState("ok");
      router.refresh();
    } catch (e) {
      setState("err");
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-3 border-t border-dashed border-[var(--card-border)] bg-slate-50/30 px-6 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        편집
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-slate-600">우선순위</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded border border-[var(--card-border)] bg-white px-2 py-1 text-xs"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-slate-600">태그 (@feature:)</span>
          <input
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="product.subarea.action"
            className="rounded border border-[var(--card-border)] bg-white px-2 py-1 font-mono text-xs"
          />
        </label>
        <label className="flex items-end gap-2 text-xs">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span className="text-slate-600">활성 (isActive)</span>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-slate-600">노트</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="이 기능에 대한 메모, 주의사항, 이슈 등"
          className="rounded border border-[var(--card-border)] bg-white px-2 py-1 text-xs"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!dirty || state === "saving"}
          onClick={save}
          className={`rounded px-3 py-1 text-xs font-semibold ${
            dirty && state !== "saving"
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-slate-200 text-slate-400"
          }`}
        >
          {state === "saving" ? "저장 중..." : "저장"}
        </button>
        {state === "ok" && (
          <span className="text-xs text-emerald-600">✓ 저장됨</span>
        )}
        {state === "err" && (
          <span className="text-xs text-rose-600">✗ {err}</span>
        )}
      </div>
    </div>
  );
}
