"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const SUITES = [
  { value: "cmr", label: "CMR (Makestar)", desc: "메인 사이트 모니터링" },
  { value: "albumbuddy", label: "AlbumBuddy", desc: "구매 대행 모니터링" },
  { value: "admin", label: "Admin", desc: "관리자 페이지 (VPN 필요)", warn: true },
  { value: "all", label: "All", desc: "전체 실행 (admin 제외)" },
];

interface TestCaseResult {
  id: number;
  title: string;
  file: string | null;
  project: string | null;
  status: string;
  durationMs: number;
}

interface RunSummary {
  runId: number;
  suite: string;
  status: string;
  total: number;
  passed: number;
  failed: number;
  flaky: number;
  createdAt: string;
}

export default function TriggerPage() {
  const [suite, setSuite] = useState("cmr");
  const [project, setProject] = useState("");
  const [spec, setSpec] = useState("");
  const [grep, setGrep] = useState("");
  const [retries, setRetries] = useState("1");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message?: string;
    error?: string;
    actionsUrl?: string;
  } | null>(null);

  // 테스트 결과 (트리거 후에만 표시)
  const [latestRun, setLatestRun] = useState<RunSummary | null>(null);
  const [testCases, setTestCases] = useState<TestCaseResult[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [triggered, setTriggered] = useState(false);
  // 이미 실행 중인 테스트가 있는지 확인
  const [alreadyRunning, setAlreadyRunning] = useState(false);
  // 트리거 시점의 이전 runId (이보다 새로운 run만 표시)
  const [prevRunId, setPrevRunId] = useState<number | null>(null);
  // 새 run 대기 중
  const [waitingForNewRun, setWaitingForNewRun] = useState(false);

  const selectedSuite = SUITES.find((s) => s.value === suite);

  const fetchLatestResults = useCallback(async () => {
    try {
      const runsRes = await fetch("/api/runs?limit=1");
      if (!runsRes.ok) return;
      const runs = await runsRes.json();
      if (runs.length === 0) return;

      const run = runs[0];
      setAlreadyRunning(run.status === "running");

      // 트리거 후 대기 중: 이전 run과 같으면 아직 새 run이 안 들어온 것
      if (prevRunId !== null && run.runId === prevRunId && run.status !== "running") {
        // 새 run 아직 미도착 → 대기 유지
        return;
      }

      // 새 run 감지 → 대기 해제
      if (waitingForNewRun && (run.runId !== prevRunId || run.status === "running")) {
        setWaitingForNewRun(false);
      }

      setLatestRun(run);

      // running 상태 감지 시 자동 폴링 시작
      if (run.status === "running") {
        setPolling(true);
        setTriggered(true);
      }

      const casesRes = await fetch(`/api/runs/${run.runId}/tests`);
      if (casesRes.ok) {
        setTestCases(await casesRes.json());
      }
    } catch {
      // ignore
    } finally {
      setCasesLoading(false);
    }
  }, [prevRunId, waitingForNewRun]);

  // 페이지 진입 시 실행 중인 테스트가 있는지 확인
  useEffect(() => {
    fetchLatestResults();
  }, [fetchLatestResults]);

  // 폴링: 새 run 대기 중이거나 running 상태일 때 5초, 아니면 15초
  const [polling, setPolling] = useState(false);
  useEffect(() => {
    if (!polling) return;
    const fast = waitingForNewRun || latestRun?.status === "running";
    const interval = setInterval(async () => {
      await fetchLatestResults();
    }, fast ? 5000 : 15000);
    return () => clearInterval(interval);
  }, [polling, fetchLatestResults, latestRun?.status, waitingForNewRun]);

  // running → completed 전환 시 자동으로 폴링 중지
  useEffect(() => {
    if (
      polling &&
      !waitingForNewRun &&
      latestRun &&
      latestRun.status !== "running" &&
      testCases.length > 0
    ) {
      const timer = setTimeout(() => {
        fetchLatestResults();
        setPolling(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [polling, waitingForNewRun, latestRun, testCases.length, fetchLatestResults]);

  async function handleTrigger() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suite, project, spec, grep, retries }),
      });
      const data = await res.json();
      setResult(data);
      if (data.ok) {
        // 현재 최신 runId를 기억 → 이보다 새로운 run만 표시
        setPrevRunId(latestRun?.runId ?? null);
        setWaitingForNewRun(true);
        setTriggered(true);
        setCasesLoading(true);
        setLatestRun(null);
        setTestCases([]);
        setPolling(true);
        // 10분 후 폴링 중지
        setTimeout(() => setPolling(false), 600000);
      }
    } catch {
      setResult({ ok: false, error: "네트워크 오류" });
    } finally {
      setLoading(false);
    }
  }

  const failedCases = testCases.filter((c) => c.status === "failed");
  const flakyCases = testCases.filter((c) => c.status === "flaky");
  const passedCases = testCases.filter((c) => c.status === "passed");
  const isRunning = latestRun?.status === "running";
  const completedCount = testCases.length;
  const totalCount = latestRun?.total || 0;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
              <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
              </svg>
            </div>
            <Link href="/dashboard" className="text-lg font-bold text-white hover:text-indigo-400 transition-colors">
              Makestar QA Dashboard
            </Link>
          </div>
          <nav className="flex gap-2 text-sm">
            <Link href="/dashboard" className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--muted)] transition-colors hover:text-white hover:bg-white/5">
              대시보드
            </Link>
            <Link href="/trigger" className="rounded-lg bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-400">
              테스트 실행
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          {/* 왼쪽: 트리거 폼 */}
          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
              테스트 실행 트리거
            </h2>
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
              <fieldset className="mb-6">
                <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Suite</legend>
                <div className="grid grid-cols-2 gap-2">
                  {SUITES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setSuite(s.value)}
                      className={`rounded-lg border p-3 text-left transition-all ${
                        suite === s.value
                          ? "border-indigo-500/50 bg-indigo-500/10"
                          : "border-[var(--card-border)] bg-white/[0.02] hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${suite === s.value ? "text-indigo-400" : "text-slate-300"}`}>
                          {s.label}
                        </span>
                        {s.warn && (
                          <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">VPN</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[var(--muted)]">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </fieldset>

              {selectedSuite?.warn && (
                <div className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                  <p className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    Admin suite는 GitHub Hosted Runner에서 VPN/IP 제한으로 실패합니다.
                  </p>
                </div>
              )}

              <div className="mb-6 space-y-4">
                <InputField id="project" label="Project (선택)" placeholder="예: cmr-monitoring" value={project} onChange={setProject} />
                <InputField id="spec" label="Spec 파일 (선택)" placeholder="예: tests/cmr_monitoring_pom.spec.ts" value={spec} onChange={setSpec} />
                <InputField id="grep" label="Grep 패턴 (선택)" placeholder="예: CMR-HOME, CMR-SEARCH" value={grep} onChange={setGrep} />
                <div>
                  <label htmlFor="retries" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Retries</label>
                  <select id="retries" value={retries} onChange={(e) => setRetries(e.target.value)} className="w-full rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20">
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n} className="bg-[var(--card)]">{n}</option>
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
                    현재 다른 테스트가 실행 중입니다. 실행 시 큐에 추가되어 순차적으로 진행됩니다.
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
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    트리거 중...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                    </svg>
                    {alreadyRunning ? "큐에 추가" : "테스트 실행"}
                  </>
                )}
              </button>

              {result && (
                <div className={`mt-4 rounded-lg border px-4 py-3 ${result.ok ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5"}`}>
                  {result.ok ? (
                    <div>
                      <p className="text-sm font-semibold text-emerald-400">{result.message}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">실행 중 결과가 실시간으로 오른쪽 패널에 표시됩니다.</p>
                      {result.actionsUrl && (
                        <a href={result.actionsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                          GitHub Actions에서 실시간 확인
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-rose-400">{result.error}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 최근 테스트 케이스 결과 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {isRunning ? "실시간 테스트 결과" : "최근 테스트 결과"}
                </h2>
                {isRunning && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    실행 중
                  </span>
                )}
                {polling && !isRunning && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-400">
                    <svg className="h-2.5 w-2.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    대기 중
                  </span>
                )}
              </div>
              {triggered && (
                <button
                  onClick={() => { setCasesLoading(true); fetchLatestResults(); }}
                  className="rounded p-1 text-[var(--muted)] hover:text-white hover:bg-white/5 transition-colors"
                  title="새로고침"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                </button>
              )}
            </div>

            {!triggered ? (
              <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--card)] p-10 text-center text-sm text-[var(--muted)]">
                테스트를 실행하면 결과가 여기에 표시됩니다
              </div>
            ) : waitingForNewRun || (casesLoading && !latestRun) ? (
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-10 text-center">
                <svg className="mx-auto h-6 w-6 animate-spin text-indigo-400 mb-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm font-semibold text-slate-300 mb-1">테스트 시작 대기 중</p>
                <p className="text-xs text-[var(--muted)]">GitHub Actions에서 실행이 시작되면 자동으로 결과가 표시됩니다</p>
              </div>
            ) : !latestRun ? (
              <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--card)] p-10 text-center text-sm text-[var(--muted)]">
                테스트 결과를 불러오는 중...
              </div>
            ) : (
              <>
                {/* Run 요약 헤더 */}
                <Link
                  href={`/runs/${latestRun.runId}`}
                  className="mb-3 flex items-center justify-between rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 transition-all hover:border-indigo-500/30"
                >
                  <div className="flex items-center gap-3">
                    <RunStatusDot status={latestRun.status} />
                    <div>
                      <span className="text-sm font-semibold text-slate-200">
                        Run #{latestRun.runId}
                      </span>
                      <span className="ml-2 rounded border border-[var(--card-border)] bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                        {latestRun.suite}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {isRunning ? (
                      <span className="text-slate-300 font-mono">
                        {completedCount} / {totalCount}
                      </span>
                    ) : (
                      <>
                        <span className="text-emerald-400 font-semibold">{latestRun.passed}</span>
                        <span className="text-[var(--muted)]">/</span>
                        <span className="text-slate-300">{latestRun.total}</span>
                      </>
                    )}
                    {latestRun.failed > 0 && (
                      <span className="ml-1 rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-400">
                        {latestRun.failed} failed
                      </span>
                    )}
                  </div>
                </Link>

                {/* 프로그레스 바 (running 상태일 때) */}
                {isRunning && totalCount > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                        진행률
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {Math.round((completedCount / totalCount) * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min((completedCount / totalCount) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[var(--muted)]">
                      {latestRun.passed > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          통과 {latestRun.passed}
                        </span>
                      )}
                      {latestRun.failed > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                          실패 {latestRun.failed}
                        </span>
                      )}
                      {latestRun.flaky > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                          Flaky {latestRun.flaky}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* 테스트 케이스 목록 */}
                <div className="max-h-[calc(100vh-220px)] overflow-y-auto space-y-1 pr-1">
                  {testCases.length === 0 && isRunning && (
                    <div className="rounded-lg border border-dashed border-[var(--card-border)] bg-[var(--card)] p-8 text-center">
                      <svg className="mx-auto h-5 w-5 animate-spin text-indigo-400 mb-2" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <p className="text-xs text-[var(--muted)]">테스트 실행 준비 중...</p>
                    </div>
                  )}
                  {failedCases.length > 0 && (
                    <CaseGroup label="실패" count={failedCases.length} dotColor="bg-rose-400" cases={failedCases} />
                  )}
                  {flakyCases.length > 0 && (
                    <CaseGroup label="Flaky" count={flakyCases.length} dotColor="bg-amber-400" cases={flakyCases} />
                  )}
                  {passedCases.length > 0 && (
                    <CaseGroup label="통과" count={passedCases.length} dotColor="bg-emerald-400" cases={passedCases} />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function CaseGroup({
  label,
  count,
  dotColor,
  cases,
}: {
  label: string;
  count: number;
  dotColor: string;
  cases: TestCaseResult[];
}) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 px-1 py-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          {label}
        </span>
        <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-[var(--muted)]">
          {count}
        </span>
      </div>
      {cases.map((tc) => (
        <CaseRow key={tc.id} tc={tc} />
      ))}
    </div>
  );
}

function CaseRow({ tc }: { tc: TestCaseResult }) {
  const statusConfig: Record<string, { dot: string; text: string }> = {
    passed: { dot: "bg-emerald-400", text: "text-emerald-400" },
    failed: { dot: "bg-rose-400", text: "text-rose-400" },
    flaky: { dot: "bg-amber-400", text: "text-amber-400" },
    skipped: { dot: "bg-slate-400", text: "text-slate-400" },
  };
  const config = statusConfig[tc.status] || statusConfig.skipped;

  // 테스트 제목에서 ID 부분 분리 (예: "CMR-HOME-01: 메인 페이지...")
  const idMatch = tc.title.match(/^([A-Z]+-[A-Z]+-\d+):\s*(.+)$/);

  const durationSec = (tc.durationMs / 1000).toFixed(1);

  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.02]">
      <span className={`h-2 w-2 shrink-0 rounded-full ${config.dot}`} />
      <div className="min-w-0 flex-1">
        {idMatch ? (
          <p className="text-xs truncate">
            <span className={`font-mono font-semibold ${config.text}`}>{idMatch[1]}</span>
            <span className="text-slate-400 ml-1">{idMatch[2]}</span>
          </p>
        ) : (
          <p className="text-xs text-slate-300 truncate">{tc.title}</p>
        )}
      </div>
      <span className="shrink-0 text-[10px] font-mono text-[var(--muted)]">
        {durationSec}s
      </span>
    </div>
  );
}

function RunStatusDot({ status }: { status: string }) {
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

function InputField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
      />
    </div>
  );
}
