"use client";

import { useRef } from "react";
import { AppHeader } from "@/components/AppHeader";
import { TriggerGuide } from "@/components/TriggerGuide";
import { TriggerForm } from "@/components/trigger/TriggerForm";
import { TestResultsPanel } from "@/components/trigger/TestResultsPanel";
import { useTriggerPolling } from "@/lib/hooks/useTriggerPolling";

export default function TriggerPage() {
  const resultsPanelRef = useRef<HTMLDivElement>(null);

  const {
    latestRun,
    testCases,
    casesLoading,
    polling,
    waitingForNewRun,
    alreadyRunning,
    triggered,
    pollingStopped,
    fetchLatestResults,
    startPolling,
    resumePolling,
  } = useTriggerPolling();

  function handleTriggerSuccess() {
    startPolling(latestRun?.runId ?? null);

    // 모바일: 트리거 후 결과 패널로 스크롤
    requestAnimationFrame(() => {
      resultsPanelRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AppHeader active="trigger" />

      <main id="main-content" className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          <TriggerForm
            alreadyRunning={alreadyRunning}
            onTriggerSuccess={handleTriggerSuccess}
          />

          <div ref={resultsPanelRef}>
            <TestResultsPanel
              latestRun={latestRun}
              testCases={testCases}
              casesLoading={casesLoading}
              triggered={triggered}
              waitingForNewRun={waitingForNewRun}
              polling={polling}
              pollingStopped={pollingStopped}
              onRefresh={fetchLatestResults}
              onResumePolling={resumePolling}
            />
          </div>
        </div>
      </main>

      <TriggerGuide />
    </div>
  );
}
