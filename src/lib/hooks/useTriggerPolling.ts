"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { RunSummary, TestCaseResult } from "@/lib/types/trigger";

type UseTriggerPollingReturn = {
  latestRun: RunSummary | null;
  testCases: TestCaseResult[];
  casesLoading: boolean;
  polling: boolean;
  waitingForNewRun: boolean;
  alreadyRunning: boolean;
  triggered: boolean;
  pollingStopped: boolean;
  fetchLatestResults: () => Promise<void>;
  startPolling: (currentRunId: number | null) => void;
  setTriggered: (v: boolean) => void;
  resumePolling: () => void;
};

export function useTriggerPolling(): UseTriggerPollingReturn {
  const [latestRun, setLatestRun] = useState<RunSummary | null>(null);
  const [testCases, setTestCases] = useState<TestCaseResult[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const [alreadyRunning, setAlreadyRunning] = useState(false);
  const [prevRunId, setPrevRunId] = useState<number | null>(null);
  const [waitingForNewRun, setWaitingForNewRun] = useState(false);
  const [polling, setPolling] = useState(false);
  const [pollingStopped, setPollingStopped] = useState(false);

  const prevStatusRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLatestResults = useCallback(async () => {
    try {
      const runsRes = await fetch("/api/runs?limit=1");
      if (!runsRes.ok) return;
      const data = await runsRes.json();
      if (data.runs.length === 0) return;

      const run = data.runs[0];
      setAlreadyRunning(run.status === "running");

      if (
        prevRunId !== null &&
        run.runId === prevRunId &&
        run.status !== "running"
      ) {
        return;
      }

      if (
        waitingForNewRun &&
        (run.runId !== prevRunId || run.status === "running")
      ) {
        setWaitingForNewRun(false);
      }

      setLatestRun(run);

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

  // 완료 감지: running → completed 전환 시 알림
  useEffect(() => {
    if (!latestRun) return;
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = latestRun.status;

    if (
      prevStatus === "running" &&
      latestRun.status !== "running" &&
      testCases.length > 0
    ) {
      // 브라우저 알림
      if (Notification.permission === "granted") {
        const passed = latestRun.passed;
        const total = latestRun.total;
        const failed = latestRun.failed;
        new Notification(`Run #${latestRun.runId} 완료`, {
          body: `${passed}/${total} 통과${failed > 0 ? `, ${failed} 실패` : ""}`,
          icon: "/favicon.ico",
        });
      }
    }
  }, [latestRun, testCases.length]);

  // 페이지 진입 시 최신 결과 확인
  useEffect(() => {
    fetchLatestResults();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 탭 전환 시 데이터 갱신
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        fetchLatestResults();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchLatestResults]);

  // 폴링 인터벌
  useEffect(() => {
    if (!polling) return;
    const fast = waitingForNewRun || latestRun?.status === "running";
    const interval = setInterval(
      () => {
        fetchLatestResults();
      },
      fast ? 5000 : 15000,
    );
    return () => clearInterval(interval);
  }, [polling, fetchLatestResults, latestRun?.status, waitingForNewRun]);

  // running → completed 전환 시 폴링 자동 중지
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
  }, [
    polling,
    waitingForNewRun,
    latestRun,
    testCases.length,
    fetchLatestResults,
  ]);

  function startPolling(currentRunId: number | null) {
    setPrevRunId(currentRunId);
    setWaitingForNewRun(true);
    setTriggered(true);
    setCasesLoading(true);
    setLatestRun(null);
    setTestCases([]);
    setPolling(true);
    setPollingStopped(false);
    prevStatusRef.current = null;

    // 알림 권한 요청
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    // 10분 후 폴링 자동 중지
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setPolling(false);
      setPollingStopped(true);
    }, 600000);
  }

  function resumePolling() {
    setPolling(true);
    setPollingStopped(false);
    fetchLatestResults();
  }

  // cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return {
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
    setTriggered,
    resumePolling,
  };
}
