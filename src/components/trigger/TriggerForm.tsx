"use client";

import { useState } from "react";
import { InputField } from "./InputField";
import { StyledSelect } from "@/components/ui/StyledSelect";
import type { TriggerResult } from "@/lib/types/trigger";

const SUITES = [
  { value: "cmr", label: "CMR (Makestar)", desc: "메인 사이트 모니터링" },
  { value: "albumbuddy", label: "앨범버디", desc: "구매 대행 모니터링" },
  {
    value: "admin",
    label: "통합매니저",
    desc: "통합매니저 관리자 페이지 (VPN 필요)",
    warn: true,
  },
  { value: "all", label: "전체", desc: "전체 실행 (통합매니저 제외)" },
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
      <h2 className="mb-5 text-xl font-bold text-[var(--foreground)] tracking-tight">
        테스트 실행
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
                className={`relative overflow-hidden rounded-lg border p-3 text-left transition-all ${
                  suite === s.value
                    ? "border-slate-400 bg-slate-50"
                    : "border-[var(--card-border)] bg-white hover:bg-slate-50"
                }`}
              >
                {suite === s.value && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-slate-500 rounded-r-full" />
                )}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold ${suite === s.value ? "text-slate-700" : "text-slate-600"}`}
                  >
                    {s.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {s.warn && (
                      <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                        VPN
                      </span>
                    )}
                    {suite === s.value && (
                      <svg
                        className="h-4 w-4 text-slate-700"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    )}
                  </div>
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
                  className={`relative overflow-hidden rounded-lg border p-3 text-left transition-all ${
                    environment === env
                      ? "border-slate-400 bg-slate-50"
                      : "border-[var(--card-border)] bg-white hover:bg-slate-50"
                  }`}
                >
                  {environment === env && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-slate-500 rounded-r-full" />
                  )}
                  <span
                    className={`text-sm font-semibold ${environment === env ? "text-slate-700" : "text-slate-600"}`}
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
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-amber-600">
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
              통합매니저 suite는 GitHub Hosted Runner에서 VPN/IP 제한으로 실패합니다.
            </p>
          </div>
        )}

        <div className="mb-6 space-y-4">
          <InputField
            id="project"
            label="Project (선택)"
            placeholder="cmr-monitoring"
            value={project}
            onChange={setProject}
          />
          <InputField
            id="spec"
            label="Spec 파일 (선택)"
            placeholder="tests/cmr_monitoring_pom.spec.ts"
            value={spec}
            onChange={setSpec}
          />
          <InputField
            id="grep"
            label="Grep 패턴 (선택)"
            placeholder="CMR-HOME, CMR-SEARCH"
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
            <StyledSelect
              id="retries"
              value={retries}
              onChange={(e) => setRetries(e.target.value)}
            >
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </StyledSelect>
          </div>
        </div>

        {alreadyRunning && !result && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
              </span>
              현재 다른 테스트가 실행 중입니다. 실행 시 큐에 추가되어 순차적으로
              진행됩니다.
            </p>
          </div>
        )}

        <button
          onClick={handleTrigger}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
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
            className={`mt-4 rounded-lg border px-4 py-3 ${result.ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}
          >
            {result.ok ? (
              <div>
                <p className="text-sm font-semibold text-emerald-700">
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
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 transition-colors"
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
              <p className="text-sm font-semibold text-rose-600">
                {result.error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
