"use client";

import { useEffect, useRef, useState } from "react";

const steps = [
  {
    num: 1,
    title: "Suite 필터",
    desc: '상단 필터로 전체 / CMR / AlbumBuddy / Admin 스위트별 데이터를 필터링. 실행 중인 테스트가 있으면 녹색 "실행 중" 뱃지 표시.',
    color: "text-indigo-400",
    border: "border-indigo-500/20",
    bg: "bg-indigo-500/5",
  },
  {
    num: 2,
    title: "최근 실행 요약",
    desc: "최신 Run의 총 테스트 수, 통과, 실패, 통과율을 카드로 한눈에 확인. 통과율은 프로그레스 바로 시각화.",
    color: "text-emerald-400",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/5",
  },
  {
    num: 3,
    title: "트렌드 차트",
    desc: "통과율 추이를 시간순 그래프로 표시. 품질 트렌드를 파악하고 회귀를 빠르게 감지.",
    color: "text-blue-400",
    border: "border-blue-500/20",
    bg: "bg-blue-500/5",
  },
  {
    num: 4,
    title: "Flaky 랭킹",
    desc: "불안정하게 실패하는 테스트를 빈도순으로 랭킹. 우선 수정이 필요한 테스트를 식별.",
    color: "text-amber-400",
    border: "border-amber-500/20",
    bg: "bg-amber-500/5",
  },
  {
    num: 5,
    title: "실행 히스토리 & 비교",
    desc: "전체 Run 목록을 테이블로 조회. 체크박스로 2개 Run을 선택하면 비교 버튼이 나타나 결과를 비교 분석 가능.",
    color: "text-purple-400",
    border: "border-purple-500/20",
    bg: "bg-purple-500/5",
  },
];

export function DashboardGuide() {
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
        <div className="mb-3 w-[calc(100vw-48px)] max-w-[360px] max-h-[70vh] overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-2xl shadow-black/40">
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Dashboard 가이드
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[var(--muted)] hover:text-white"
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
              <span className="rounded-md bg-indigo-500/15 px-2 py-1 text-indigo-300">
                필터
              </span>
              <span className="text-[var(--muted)]">→</span>
              <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-emerald-300">
                요약
              </span>
              <span className="text-[var(--muted)]">→</span>
              <span className="rounded-md bg-blue-500/15 px-2 py-1 text-blue-300">
                트렌드
              </span>
              <span className="text-[var(--muted)]">→</span>
              <span className="rounded-md bg-amber-500/15 px-2 py-1 text-amber-300">
                Flaky
              </span>
              <span className="text-[var(--muted)]">→</span>
              <span className="rounded-md bg-purple-500/15 px-2 py-1 text-purple-300">
                히스토리
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
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-bold ${s.color}`}
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
            <div className="mt-3 rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                팁
              </p>
              <ul className="space-y-1 text-[11px] text-[var(--muted)]">
                <li>
                  • 테스트 실행 중에는{" "}
                  <strong className="text-white/80">5초마다</strong> 자동 갱신,
                  유휴 시 <strong className="text-white/80">30초</strong> 간격
                </li>
                <li>
                  • 탭 전환 후 복귀하면{" "}
                  <strong className="text-white/80">즉시 데이터 갱신</strong>
                </li>
                <li>
                  • 히스토리에서{" "}
                  <strong className="text-white/80">2개 Run 선택</strong> → 비교
                  분석 가능
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
        className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-lg transition-all ${
          open
            ? "border-indigo-500/40 bg-indigo-500/20 text-indigo-300 shadow-indigo-500/10"
            : "border-[var(--card-border)] bg-[var(--card)] text-[var(--muted)] hover:border-indigo-500/30 hover:text-indigo-300 shadow-black/30"
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
