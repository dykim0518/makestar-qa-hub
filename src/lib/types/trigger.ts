export type TestCaseResult = {
  id: number;
  title: string;
  file: string | null;
  project: string | null;
  status: string;
  durationMs: number;
};

export type RunSummary = {
  runId: number;
  suite: string;
  status: string;
  total: number;
  passed: number;
  failed: number;
  flaky: number;
  createdAt: string;
};

export type TriggerResult = {
  ok: boolean;
  message?: string;
  error?: string;
  actionsUrl?: string;
};
