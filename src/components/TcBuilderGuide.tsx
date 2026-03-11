"use client";

import { useEffect, useRef, useState } from "react";

const steps = [
  {
    num: 1,
    title: "프로젝트 생성",
    desc: "새 프로젝트명을 입력하고 \"+ 생성\" 클릭. 기존 프로젝트는 드롭다운에서 선택.",
    color: "text-indigo-400",
    border: "border-indigo-500/20",
    bg: "bg-indigo-500/5",
  },
  {
    num: 2,
    title: "소스 추가 (요구사항 수집)",
    desc: "소스 카드 \"+ 추가\" → Notion URL / Figma URL / PDF 파일 입력 → 요구사항 자동 수집. 여러 소스를 반복 추가 가능.",
    color: "text-blue-400",
    border: "border-blue-500/20",
    bg: "bg-blue-500/5",
  },
  {
    num: 3,
    title: "템플릿 임포트 & 승인",
    desc: "템플릿 카드 \"임포트\" → 기존 TC Google Sheet URL 입력 → \"분석\" → draft 생성 → \"승인\" 클릭.",
    color: "text-purple-400",
    border: "border-purple-500/20",
    bg: "bg-purple-500/5",
  },
  {
    num: 4,
    title: "TC 생성",
    desc: "템플릿 승인 후 \"초안 생성\"(빠른 프로토타입) 또는 \"엄격 생성\"(정밀 스타일 매칭) 클릭.",
    color: "text-emerald-400",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/5",
  },
  {
    num: 5,
    title: "검증 & CSV 다운로드",
    desc: "실행 이력 카드에서 \"검증\" → 중복·누락·포맷 이슈 확인. \"CSV\" 로 결과를 다운로드. \"상세\" 로 Run 상세 페이지 이동.",
    color: "text-amber-400",
    border: "border-amber-500/20",
    bg: "bg-amber-500/5",
  },
];

export function TcBuilderGuide() {
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
        <div className="mb-3 w-[360px] max-h-[70vh] overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-2xl shadow-black/40">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              사용 가이드
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[var(--muted)] hover:text-white"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="px-4 pb-4 pt-3">
            {/* Flow diagram */}
            <div className="mb-4 flex flex-wrap items-center justify-center gap-1 text-[10px] font-semibold">
              <span className="rounded-md bg-indigo-500/15 px-2 py-1 text-indigo-300">프로젝트</span>
              <span className="text-[var(--muted)]">→</span>
              <span className="rounded-md bg-blue-500/15 px-2 py-1 text-blue-300">소스 수집</span>
              <span className="text-[var(--muted)]">→</span>
              <span className="rounded-md bg-purple-500/15 px-2 py-1 text-purple-300">템플릿</span>
              <span className="text-[var(--muted)]">→</span>
              <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-emerald-300">TC 생성</span>
              <span className="text-[var(--muted)]">→</span>
              <span className="rounded-md bg-amber-500/15 px-2 py-1 text-amber-300">검증/CSV</span>
            </div>

            {/* Steps */}
            <div className="space-y-2">
              {steps.map((s) => (
                <div
                  key={s.num}
                  className={`rounded-lg border ${s.border} ${s.bg} px-3 py-2.5`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-bold ${s.color}`}>
                      {s.num}
                    </span>
                    <div>
                      <p className={`text-xs font-semibold ${s.color}`}>{s.title}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--muted)]">{s.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tips */}
            <div className="mt-3 rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5">팁</p>
              <ul className="space-y-1 text-[11px] text-[var(--muted)]">
                <li>• 소스는 <strong className="text-white/80">Notion, Figma, PDF</strong> 여러 개 조합 가능</li>
                <li>• 템플릿은 기존 TC Sheet의 <strong className="text-white/80">스타일을 학습</strong>하여 동일 포맷 생성</li>
                <li>• <strong className="text-white/80">초안</strong> = 빠른 프로토타입, <strong className="text-white/80">엄격</strong> = 최종 산출물</li>
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
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <circle cx="12" cy="17" r=".5" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
