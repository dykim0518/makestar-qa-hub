"use client";

import { useEffect, useRef, useState } from "react";

const steps = [
  {
    num: 1,
    title: "Suite 선택",
    desc: "CMR(메인 사이트) / AlbumBuddy(구매 대행) / Admin(관리자, VPN 필요) / All(전체, admin 제외) 중 실행할 스위트를 선택.",
    color: "text-slate-600",
    border: "border-slate-200",
    bg: "bg-slate-50",
  },
  {
    num: 2,
    title: "필터 옵션 설정",
    desc: "Project, Spec 파일, Grep 패턴으로 특정 테스트만 실행 가능. Retries로 실패 시 재시도 횟수 설정 (0~5).",
    color: "text-blue-600",
    border: "border-blue-500/20",
    bg: "bg-blue-500/5",
  },
  {
    num: 3,
    title: "테스트 실행",
    desc: '"테스트 실행" 버튼 클릭으로 GitHub Actions 워크플로우 트리거. 이미 실행 중이면 큐에 추가됨 (최대 5개).',
    color: "text-emerald-700",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/5",
  },
  {
    num: 4,
    title: "실시간 결과 확인",
    desc: "오른쪽 패널에서 진행률, 통과/실패/Flaky 테스트를 실시간으로 확인. 5초마다 자동 갱신.",
    color: "text-purple-600",
    border: "border-purple-500/20",
    bg: "bg-purple-500/5",
  },
  {
    num: 5,
    title: "결과 상세 & Actions 링크",
    desc: "Run 헤더 클릭 시 상세 페이지로 이동. GitHub Actions 링크로 CI 로그를 직접 확인 가능.",
    color: "text-amber-600",
    border: "border-amber-500/20",
    bg: "bg-amber-500/5",
  },
];

export function TriggerGuide() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="fixed bottom-6 right-6 z-50" ref={panelRef}>
      {/* Panel */}
      {open && (
        <div className="mb-3 w-[calc(100vw-48px)] max-w-[360px] max-h-[70vh] overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-2xl shadow-slate-200/60">
          <div className="h-1 bg-gradient-to-r from-slate-400 via-slate-500 to-slate-400" />
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              테스트 실행 가이드
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="가이드 닫기"
              className="text-[var(--muted)] hover:text-slate-900"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="px-4 pb-4 pt-3">
            {/* Flow diagram */}
            <div className="mb-4 flex flex-wrap items-center justify-center gap-1 text-[10px] font-semibold">
              <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">
                Suite
              </span>
              <span className="text-[var(--muted)]">→</span>
              <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-600">
                필터
              </span>
              <span className="text-[var(--muted)]">→</span>
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
                실행
              </span>
              <span className="text-[var(--muted)]">→</span>
              <span className="rounded-md bg-purple-50 px-2 py-1 text-purple-600">
                결과
              </span>
              <span className="text-[var(--muted)]">→</span>
              <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-600">
                상세
              </span>
            </div>

            {/* Steps */}
            <div className="space-y-2.5">
              {steps.map((s) => (
                <div
                  key={s.num}
                  className={`rounded-lg border ${s.border} ${s.bg} px-3 py-2.5`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold ${s.color}`}
                    >
                      {s.num}
                    </span>
                    <div>
                      <p className={`text-xs font-semibold ${s.color}`}>
                        {s.title}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--muted)]">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tips */}
            <div className="mt-3 rounded-lg border border-[var(--card-border)] bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                팁
              </p>
              <ul className="space-y-1 text-[11px] text-[var(--muted)]">
                <li>
                  • <strong className="text-slate-700">Grep 패턴</strong>으로
                  특정 TC만 실행 (예: CMR-HOME, CMR-SEARCH)
                </li>
                <li>
                  • <strong className="text-slate-700">Admin</strong> suite는
                  VPN 연결 필요 (GitHub Runner에서 실패)
                </li>
                <li>
                  • 탭 전환 후 복귀하면{" "}
                  <strong className="text-slate-700">
                    즉시 최신 결과 갱신
                  </strong>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* FAB button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? "가이드 닫기" : "테스트 실행 가이드 열기"}
        aria-expanded={open}
        className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-lg transition-all ${
          open
            ? "border-slate-300 bg-slate-100 text-slate-700 shadow-slate-200/60"
            : "border-[var(--card-border)] bg-[var(--card)] text-[var(--muted)] hover:border-slate-300 hover:text-slate-700 shadow-slate-200/60"
        }`}
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="12" cy="12" r="10" />
          <path
            strokeLinecap="round"
            d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
          />
          <circle cx="12" cy="17" r=".5" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
