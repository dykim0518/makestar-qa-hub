"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { QaOkrMetric } from "@/db/schema";

type FormState = {
  milestone: string;
  periodStart: string;
  periodEnd: string;
  tcCount: string;
  totalDefects: string;
  openDefects: string;
  postReleaseDefects: string;
  comment: string;
};

const EMPTY: FormState = {
  milestone: "",
  periodStart: "",
  periodEnd: "",
  tcCount: "",
  totalDefects: "",
  openDefects: "",
  postReleaseDefects: "",
  comment: "",
};

function fromMetric(metric: QaOkrMetric): FormState {
  return {
    milestone: metric.milestone,
    periodStart: metric.periodStart,
    periodEnd: metric.periodEnd,
    tcCount: String(metric.tcCount),
    totalDefects: String(metric.totalDefects),
    openDefects: String(metric.openDefects),
    postReleaseDefects: String(metric.postReleaseDefects),
    comment: metric.comment ?? "",
  };
}

type Props = {
  existing: QaOkrMetric[];
};

export function MetricForm({ existing }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const isEditing = useMemo(
    () => existing.some((m) => m.milestone === form.milestone),
    [existing, form.milestone],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function loadExisting(milestone: string) {
    const found = existing.find((m) => m.milestone === milestone);
    if (found) setForm(fromMetric(found));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        milestone: form.milestone.trim(),
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        tcCount: Number(form.tcCount),
        totalDefects: Number(form.totalDefects),
        openDefects: Number(form.openDefects),
        postReleaseDefects: Number(form.postReleaseDefects),
        comment: form.comment.trim() === "" ? null : form.comment.trim(),
      };
      const res = await fetch("/api/okr-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error ?? "저장에 실패했습니다.");
        return;
      }
      setSuccess(
        isEditing
          ? `${payload.milestone} 갱신 완료`
          : `${payload.milestone} 저장 완료`,
      );
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function onLogout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm sm:p-6"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="마일스톤" hint="예: Sprint 12 (3월 1차)">
            <input
              type="text"
              value={form.milestone}
              onChange={(e) => update("milestone", e.target.value)}
              required
              maxLength={120}
              className={inputClass}
            />
          </Field>
          <Field label="기간 시작" hint="YYYY-MM-DD">
            <input
              type="date"
              value={form.periodStart}
              onChange={(e) => update("periodStart", e.target.value)}
              required
              className={inputClass}
            />
          </Field>
          <Field label="기간 끝" hint="YYYY-MM-DD">
            <input
              type="date"
              value={form.periodEnd}
              onChange={(e) => update("periodEnd", e.target.value)}
              required
              className={inputClass}
            />
          </Field>
          <Field label="TC 수">
            <input
              type="number"
              min={0}
              step={1}
              value={form.tcCount}
              onChange={(e) => update("tcCount", e.target.value)}
              required
              className={inputClass}
            />
          </Field>
          <Field label="총 결함 수">
            <input
              type="number"
              min={0}
              step={1}
              value={form.totalDefects}
              onChange={(e) => update("totalDefects", e.target.value)}
              required
              className={inputClass}
            />
          </Field>
          <Field label="미해결 결함 수">
            <input
              type="number"
              min={0}
              step={1}
              value={form.openDefects}
              onChange={(e) => update("openDefects", e.target.value)}
              required
              className={inputClass}
            />
          </Field>
          <Field label="배포 후 결함 수">
            <input
              type="number"
              min={0}
              step={1}
              value={form.postReleaseDefects}
              onChange={(e) => update("postReleaseDefects", e.target.value)}
              required
              className={inputClass}
            />
          </Field>
          <Field label="코멘트" hint="이번 마일스톤 특이사항 (선택)">
            <textarea
              value={form.comment}
              onChange={(e) => update("comment", e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </Field>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
        {success ? (
          <p className="mt-4 text-sm text-emerald-700">{success}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "저장 중..." : isEditing ? "갱신" : "저장"}
          </button>
          <button
            type="button"
            onClick={() => {
              setForm(EMPTY);
              setError(null);
              setSuccess(null);
            }}
            className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-200"
          >
            새 입력
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="ml-auto rounded-lg px-3 py-2 text-xs font-medium text-[var(--muted)] hover:bg-slate-50 hover:text-slate-900"
          >
            로그아웃
          </button>
        </div>
      </form>

      {existing.length > 0 ? (
        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            기존 마일스톤 ({existing.length})
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            행을 클릭하면 폼에 값이 채워집니다. 같은 마일스톤 이름으로 저장하면
            갱신됩니다.
          </p>
          <ul className="mt-4 divide-y divide-[var(--card-border)]">
            {existing.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => loadExisting(m.milestone)}
                  className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {m.milestone}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {m.periodStart} ~ {m.periodEnd} · TC {m.tcCount} · 결함{" "}
                      {m.totalDefects}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-indigo-600">편집</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-indigo-500 focus:outline-offset-2";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint ? (
        <span className="mt-1 block text-xs text-[var(--muted)]">{hint}</span>
      ) : null}
    </label>
  );
}
