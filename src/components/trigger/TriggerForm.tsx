"use client";

import { useState } from "react";
import { InputField } from "./InputField";
import type { TriggerResult } from "@/lib/types/trigger";

const SUITES = [
  { value: "cmr", label: "CMR (Makestar)", desc: "메인 사이트 모니터링" },
  { value: "albumbuddy", label: "AlbumBuddy", desc: "구매 대행 모니터링" },
  {
    value: "admin",
    label: "Admin",
    desc: "관리자 페이지 (VPN 필요)",
    warn: true,
  },
  { value: "all", label: "All", desc: "전체 실행 (admin 제외)" },
];

type TriggerFormProps = {
  alreadyRunning: boolean;
  onTriggerSuccess: (result: TriggerResult) => void;
};

export function TriggerForm({
  alreadyRunning,
  onTriggerSuccess,
}: TriggerFormProps) {
  const [suite, setSuite] = useState("cmr");
  const [environment, setEnvironment] = useState("prod");
  const [project, setProject] = useState("");
  const [spec, setSpec] = useState("");
  const [grep, setGrep] = useState("");
  const [retries, setRetries] = useState("1");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriggerResult | null>(null);

  const selectedSuite = SUITES.find((s) => s.value === suite);

  async function handleTrigger() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suite,
          project,
          spec,
          grep,
          retries,
          environment,
        }),
      });
      const data = await res.json();
      setResult(data);
      if (data.ok) {
        onTriggerSuccess(data);
      }
    } catch {
      setResult({ ok: false, error: "네트워크 오류" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
        테스트 실행 트리거
      </h2>
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <fieldset className="mb-6">
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Suite
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {SUITES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  setSuite(s.value);
                  if (s.value !== "cmr") setEnvironment("prod");
                }}
                className={`rounded-lg border p-3 text-left transition-all ${
                  suite === s.value
                    ? "border-indigo-500/50 bg-indigo-500/10"
                    : "border-[var(--card-border)] bg-white/[0.02] hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold ${suite === s.value ? "text-indigo-400" : "text-slate-300"}`}
                  >
                    {s.label}
                  </span>
                  {s.warn && (
                    <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                      VPN
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">{s.desc}</p>
              </button>
            ))}
          </div>
        </fieldset>

        {suite === "cmr" && (
          <fieldset className="mb-6">
            <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Environment
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(["prod", "stg"] as const).map((env) => (
                <button
                  key={env}
                  type="button"
                  onClick={() => setEnvironment(env)}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    environment === env
                      ? "border-indigo-500/50 bg-indigo-500/10"
                      : "border-[var(--card-border)] bg-white/[0.02] hover:bg-white/5"
                  }`}
                >
                  <span
                    className={`text-sm font-semibold ${environment === env ? "text-indigo-400" : "text-slate-300"}`}
                  >
                    {env === "prod" ? "Production" : "Staging"}
                  </span>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {env === "prod"
                      ? "www.makestar.com"
                      : "stage-new.makeuni2026.com"}
                  </p>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {selectedSuite?.warn && (
          <div className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
              Admin suite는 GitHub Hosted Runner에서 VPN/IP 제한으로 실패합니다.
            </p>
          </div>
        )}

        <div className="mb-6 space-y-4">
          <InputField
            id="project"
            label="Project (선택)"
            placeholder="예: cmr-monitoring"
            value={project}
            onChange={setProject}
          />
          <InputField
            id="spec"
            label="Spec 파일 (선택)"
            placeholder="예: tests/cmr_monitoring_pom.spec.ts"
            value={spec}
            onChange={setSpec}
          />
          <InputField
            id="grep"
            label="Grep 패턴 (선택)"
            placeholder="예: CMR-HOME, CMR-SEARCH"
            value={grep}
            onChange={setGrep}
          />
          <div>
            <label
              htmlFor="retries"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]"
            >
              Retries
            </label>
            <select
              id="retries"
              value={retries}
              onChange={(e) => setRetries(e.target.value)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
            >
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n} className="bg-[var(--card)]">
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {alreadyRunning && !result && (
          <div className="mb-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-4 py-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-400" />
              </span>
              현재 다른 테스트가 실행 중입니다. 실행 시 큐에 추가되어 순차적으로
              진행됩니다.
            </p>
          </div>
        )}

        <button
          onClick={handleTrigger}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              트리거 중...
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                />
              </svg>
              {alreadyRunning ? "큐에 추가" : "테스트 실행"}
            </>
          )}
        </button>

        {result && (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 ${result.ok ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5"}`}
          >
            {result.ok ? (
              <div>
                <p className="text-sm font-semibold text-emerald-400">
                  {result.message}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  실행 중 결과가 실시간으로 오른쪽 패널에 표시됩니다.
                </p>
                {result.actionsUrl && (
                  <a
                    href={result.actionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    GitHub Actions에서 실시간 확인
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                      />
                    </svg>
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm font-semibold text-rose-400">
                {result.error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
