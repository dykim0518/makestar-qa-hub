"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDate } from "@/lib/format";

interface TcProject {
  id: string;
  name: string;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
}

interface TcTemplateProfile {
  id: string;
  projectId: string;
  sourceRef: string | null;
  name: string;
  status: string;
  headerRowIndex: number;
  columnMapping: Array<{ canonical: string; index: number; header: string }>;
  styleProfile: {
    stepImperativeRatio: number;
    expectedStateRatio: number;
    singleExpectedPerCellRatio: number;
    commonStepVerbs: string[];
    commonExpectedSuffixes: string[];
  };
  previewRows: Array<Record<string, string>> | null;
  createdAt: string;
  updatedAt: string;
}

interface TcSource {
  id: string;
  projectId: string;
  sourceType: string;
  sourceRef: string;
  sourceTitle: string | null;
  sourceStatus: string;
  createdAt: string;
}

interface TcRequirement {
  id: string;
  sourceId: string | null;
  requirementKey: string | null;
  title: string;
  body: string;
  priority: string | null;
  tags: string[];
  createdAt: string;
}

interface TcGenerationRun {
  id: string;
  projectId: string;
  profileId: string | null;
  status: string;
  mode: string;
  totalCases: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TcGeneratedCase {
  id: number;
  runId: string;
  no?: string | null;
  requirementId?: string | null;
  traceability: string | null;
  depth1: string | null;
  depth2: string | null;
  depth3: string | null;
  preCondition: string | null;
  step: string;
  expectedResult: string;
  result: string;
  issueKey?: string | null;
  description: string | null;
}

interface ValidationSummary {
  totalCases: number;
  duplicateCount: number;
  missingCount: number;
  formatCount: number;
  issueCount: number;
  coverageRatio: number;
}

interface ValidationIssue {
  id?: number;
  runId?: string;
  issueType: "duplicate" | "missing" | "format";
  severity: "low" | "medium" | "high";
  targetRef: string | null;
  message: string;
}

interface CoverageItem {
  requirementKey: string;
  requirementTitle: string;
  covered: boolean;
  caseRefs: string[];
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function csvEscapeCell(value: unknown): string {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: Array<Array<unknown>>): string {
  return rows.map((row) => row.map(csvEscapeCell).join(",")).join("\r\n");
}

function triggerCsvDownload(filename: string, rows: Array<Array<unknown>>): void {
  const csv = `\uFEFF${toCsv(rows)}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

interface TcTemplateManagerProps {
  initialProjectId?: string;
  initialRunId?: string;
  sectionMode?: "all" | "project" | "run";
}

export function TcTemplateManager({
  initialProjectId = "",
  initialRunId = "",
  sectionMode = "all",
}: TcTemplateManagerProps) {
  const showProjectSections = sectionMode !== "run";

  const [projects, setProjects] = useState<TcProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [sources, setSources] = useState<TcSource[]>([]);
  const [requirements, setRequirements] = useState<TcRequirement[]>([]);
  const [profiles, setProfiles] = useState<TcTemplateProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [runs, setRuns] = useState<TcGenerationRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>(initialRunId);
  const [runCases, setRunCases] = useState<TcGeneratedCase[]>([]);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [validationCoverage, setValidationCoverage] = useState<CoverageItem[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [notionUrl, setNotionUrl] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // Source add form visibility
  const [showSourceForm, setShowSourceForm] = useState<"" | "notion" | "figma" | "pdf">("");
  const [showTemplateForm, setShowTemplateForm] = useState(false);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  );
  const selectedRun = useMemo(
    () => runs.find((run) => run.id === selectedRunId) ?? null,
    [runs, selectedRunId]
  );

  // --- Data fetching (unchanged) ---
  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/tc/projects?limit=50");
    if (!res.ok) return;
    const data = await res.json();
    setProjects(data.projects ?? []);
    if (!selectedProjectId && data.projects?.[0]?.id) {
      setSelectedProjectId(data.projects[0].id);
    }
  }, [selectedProjectId]);

  const fetchProfiles = useCallback(async (projectId: string) => {
    if (!projectId) return;
    const res = await fetch(`/api/tc/projects/${projectId}/template/profiles`);
    if (!res.ok) return;
    const data = await res.json();
    const list: TcTemplateProfile[] = data.profiles ?? [];
    setProfiles(list);
    if (list.length > 0) {
      setSelectedProfileId((current) => current || list[0].id);
    } else {
      setSelectedProfileId("");
    }
  }, []);

  const fetchSources = useCallback(async (projectId: string) => {
    if (!projectId) return;
    const res = await fetch(`/api/tc/projects/${projectId}/sources`);
    if (!res.ok) return;
    const data = await res.json();
    setSources(data.sources ?? []);
  }, []);

  const fetchRequirements = useCallback(async (projectId: string) => {
    if (!projectId) return;
    const res = await fetch(`/api/tc/projects/${projectId}/requirements`);
    if (!res.ok) return;
    const data = await res.json();
    setRequirements(data.requirements ?? []);
  }, []);

  const fetchRuns = useCallback(async (projectId: string) => {
    if (!projectId) return;
    const res = await fetch(`/api/tc/projects/${projectId}/runs`);
    if (!res.ok) return;
    const data = await res.json();
    const list: TcGenerationRun[] = data.runs ?? [];
    setRuns(list);
    if (list.length > 0) {
      setSelectedRunId((current) => current || list[0].id);
    } else {
      setSelectedRunId("");
      setRunCases([]);
      setValidationSummary(null);
      setValidationIssues([]);
      setValidationCoverage([]);
    }
  }, []);

  const fetchRunCases = useCallback(async (runId: string) => {
    if (!runId) return;
    const res = await fetch(`/api/tc/runs/${runId}/cases`);
    if (!res.ok) return;
    const data = await res.json();
    setRunCases(data.cases ?? []);
  }, []);

  const fetchValidation = useCallback(async (runId: string) => {
    if (!runId) return;
    const res = await fetch(`/api/tc/runs/${runId}/validate`);
    if (!res.ok) {
      setValidationSummary(null);
      setValidationIssues([]);
      setValidationCoverage([]);
      return;
    }
    const data = await res.json();
    setValidationSummary(data.summary ?? null);
    setValidationIssues(data.issues ?? []);
    setValidationCoverage(data.coverage ?? []);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (!selectedProjectId) return;
    fetchSources(selectedProjectId);
    fetchRequirements(selectedProjectId);
    fetchProfiles(selectedProjectId);
    fetchRuns(selectedProjectId);
  }, [selectedProjectId, fetchSources, fetchRequirements, fetchProfiles, fetchRuns]);

  useEffect(() => {
    if (!selectedRunId) return;
    fetchRunCases(selectedRunId);
    fetchValidation(selectedRunId);
  }, [selectedRunId, fetchRunCases, fetchValidation]);

  // --- Handlers (unchanged) ---
  async function handleCreateProject() {
    const name = newProjectName.trim();
    if (!name) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/tc/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || "프로젝트 생성 실패"); return; }
      setNewProjectName("");
      setMessage("프로젝트를 생성했습니다.");
      await fetchProjects();
      if (data.project?.id) setSelectedProjectId(data.project.id);
    } finally { setBusy(false); }
  }

  async function handleCollectNotion() {
    if (!selectedProjectId) { setMessage("프로젝트를 먼저 선택하세요."); return; }
    if (!notionUrl.trim()) { setMessage("Notion URL을 입력하세요."); return; }
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/tc/projects/${selectedProjectId}/sources/notion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: notionUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || "Notion 소스 수집 실패"); return; }
      setMessage(`Notion 소스 수집 완료 (요구사항 ${data.insertedRequirements ?? 0}건)`);
      setNotionUrl("");
      setShowSourceForm("");
      await Promise.all([fetchSources(selectedProjectId), fetchRequirements(selectedProjectId)]);
    } finally { setBusy(false); }
  }

  async function handleCollectFigma() {
    if (!selectedProjectId) { setMessage("프로젝트를 먼저 선택하세요."); return; }
    if (!figmaUrl.trim()) { setMessage("Figma URL을 입력하세요."); return; }
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/tc/projects/${selectedProjectId}/sources/figma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: figmaUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || "Figma 소스 수집 실패"); return; }
      setMessage(`Figma 소스 수집 완료 (요구사항 ${data.insertedRequirements ?? 0}건)`);
      setFigmaUrl("");
      setShowSourceForm("");
      await Promise.all([fetchSources(selectedProjectId), fetchRequirements(selectedProjectId)]);
    } finally { setBusy(false); }
  }

  async function handleCollectPdf() {
    if (!selectedProjectId) { setMessage("프로젝트를 먼저 선택하세요."); return; }
    if (!pdfFile) { setMessage("PDF 파일을 선택하세요."); return; }
    const formData = new FormData();
    formData.set("file", pdfFile);
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/tc/projects/${selectedProjectId}/sources/pdf`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || "PDF 소스 수집 실패"); return; }
      setMessage(`PDF 소스 수집 완료 (요구사항 ${data.insertedRequirements ?? 0}건)`);
      setPdfFile(null);
      setShowSourceForm("");
      await Promise.all([fetchSources(selectedProjectId), fetchRequirements(selectedProjectId)]);
    } finally { setBusy(false); }
  }

  async function handleImportTemplate() {
    if (!selectedProjectId) { setMessage("프로젝트를 먼저 선택하세요."); return; }
    if (!sheetUrl.trim()) { setMessage("Google Sheet URL을 입력하세요."); return; }
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/tc/projects/${selectedProjectId}/template/import-google-sheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetUrl: sheetUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || "템플릿 분석 실패"); return; }
      setMessage("템플릿 프로파일을 생성했습니다.");
      setSheetUrl("");
      setShowTemplateForm(false);
      await fetchProfiles(selectedProjectId);
      if (data.profile?.id) setSelectedProfileId(data.profile.id);
    } finally { setBusy(false); }
  }

  async function handleApproveProfile() {
    if (!selectedProjectId || !selectedProfileId) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/tc/projects/${selectedProjectId}/template/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: selectedProfileId }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || "프로파일 승인 실패"); return; }
      setMessage("템플릿 프로파일을 승인했습니다.");
      await fetchProfiles(selectedProjectId);
      if (data.profile?.id) setSelectedProfileId(data.profile.id);
    } finally { setBusy(false); }
  }

  async function handleGenerateRun(mode: "draft" | "strict") {
    if (!selectedProjectId || !selectedProfileId) {
      setMessage("프로젝트와 템플릿 프로파일을 먼저 선택하세요.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/tc/projects/${selectedProjectId}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: selectedProfileId, mode }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || "TC 생성 실행 실패"); return; }
      setMessage(`TC 생성 완료: ${data.totalGeneratedCases ?? 0}건`);
      await fetchRuns(selectedProjectId);
      if (data.run?.id) setSelectedRunId(data.run.id);
    } finally { setBusy(false); }
  }

  async function handleValidateRun(runId: string) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/tc/runs/${runId}/validate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || "검증 실행 실패"); return; }
      setValidationSummary(data.summary ?? null);
      setValidationIssues(data.issues ?? []);
      setValidationCoverage(data.coverage ?? []);
      setSelectedRunId(runId);
      setMessage(`검증 완료: 이슈 ${data.issueCount ?? 0}건`);
    } finally { setBusy(false); }
  }

  function handleDownloadCsv(runId: string) {
    const cases = runId === selectedRunId ? runCases : [];
    if (cases.length === 0) {
      // If not loaded, fetch then download
      fetch(`/api/tc/runs/${runId}/cases`)
        .then((r) => r.json())
        .then((data) => {
          const list: TcGeneratedCase[] = data.cases ?? [];
          if (list.length === 0) { setMessage("다운로드할 TC 데이터가 없습니다."); return; }
          downloadCasesAsCsv(runId, list);
        });
      return;
    }
    downloadCasesAsCsv(runId, cases);
  }

  function downloadCasesAsCsv(runId: string, cases: TcGeneratedCase[]) {
    const rows: Array<Array<unknown>> = [
      ["No", "Traceability", "Depth 1", "Depth 2", "Depth 3", "Pre-Condition", "Step", "Expected Result", "Result", "Issue Key", "Description"],
      ...cases.map((tc, i) => [
        tc.no || `AUTO_${String(i + 1).padStart(4, "0")}`,
        tc.traceability || "", tc.depth1 || "", tc.depth2 || "", tc.depth3 || "",
        tc.preCondition || "", tc.step, tc.expectedResult, tc.result,
        tc.issueKey || "", tc.description || "",
      ]),
    ];
    const filename = `tc_cases_${runId.slice(0, 8)}.csv`;
    triggerCsvDownload(filename, rows);
    setMessage(`CSV 다운로드 완료 (${cases.length}건)`);
  }

  // --- Source counts ---
  const notionCount = sources.filter((s) => s.sourceType === "notion").length;
  const figmaCount = sources.filter((s) => s.sourceType === "figma").length;
  const pdfCount = sources.filter((s) => s.sourceType === "pdf").length;
  const approvedProfile = profiles.find((p) => p.status === "approved");
  const activeProfile = approvedProfile ?? selectedProfile;

  // --- Render ---
  return (
    <div className="space-y-4">
      {/* Message toast */}
      {message && (
        <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-xs text-indigo-200 flex items-center justify-between">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage("")} className="ml-3 text-indigo-400 hover:text-white">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* ─── Project ─── */}
      {showProjectSections && (
        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
          <div className="flex items-center gap-3">
            <select
              className="flex-1 rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-indigo-500/50"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="">프로젝트 선택</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                className="w-40 rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-indigo-500/50"
                placeholder="새 프로젝트명"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
              />
              <button
                type="button"
                onClick={handleCreateProject}
                disabled={busy || !newProjectName.trim()}
                className="rounded-lg bg-indigo-500/20 px-3 py-2 text-sm font-semibold text-indigo-300 whitespace-nowrap disabled:opacity-40"
              >
                + 생성
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ─── Setup: Sources + Template (compact) ─── */}
      {showProjectSections && selectedProjectId && (
        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Sources */}
            <div className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">소스</span>
                <button
                  type="button"
                  onClick={() => setShowSourceForm(showSourceForm ? "" : "notion")}
                  className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  {showSourceForm ? "닫기" : "+ 추가"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {notionCount > 0 && <Badge label={`Notion ${notionCount}`} color="blue" />}
                {figmaCount > 0 && <Badge label={`Figma ${figmaCount}`} color="purple" />}
                {pdfCount > 0 && <Badge label={`PDF ${pdfCount}`} color="slate" />}
                {sources.length === 0 && <span className="text-xs text-[var(--muted)]">없음</span>}
              </div>
            </div>

            {/* Requirements */}
            <div className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">요구사항</span>
              <p className="mt-2 text-lg font-bold text-white">{requirements.length}<span className="ml-1 text-xs font-normal text-[var(--muted)]">건</span></p>
            </div>

            {/* Template */}
            <div className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">템플릿</span>
                <button
                  type="button"
                  onClick={() => setShowTemplateForm(!showTemplateForm)}
                  className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  {showTemplateForm ? "닫기" : "임포트"}
                </button>
              </div>
              {activeProfile ? (
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${activeProfile.status === "approved" ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <span className="text-sm text-white">{activeProfile.name}</span>
                  <span className={`text-[10px] font-semibold ${activeProfile.status === "approved" ? "text-emerald-400" : "text-amber-400"}`}>
                    {activeProfile.status}
                  </span>
                  {activeProfile.status === "draft" && (
                    <button
                      type="button"
                      onClick={handleApproveProfile}
                      disabled={busy}
                      className="ml-auto text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
                    >
                      승인
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-xs text-[var(--muted)]">없음</span>
              )}
            </div>
          </div>

          {/* Source add form (inline, shown on demand) */}
          {showSourceForm && (
            <div className="mt-4 rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-4">
              <div className="flex gap-2 mb-3">
                {(["notion", "figma", "pdf"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setShowSourceForm(type)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                      showSourceForm === type
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "text-[var(--muted)] hover:text-white"
                    }`}
                  >
                    {type === "notion" ? "Notion" : type === "figma" ? "Figma" : "PDF"}
                  </button>
                ))}
              </div>
              {showSourceForm === "notion" && (
                <div className="flex gap-2">
                  <input className="flex-1 rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-indigo-500/50" placeholder="Notion 페이지 URL" value={notionUrl} onChange={(e) => setNotionUrl(e.target.value)} />
                  <button type="button" onClick={handleCollectNotion} disabled={busy} className="rounded-lg bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-300 whitespace-nowrap disabled:opacity-40">수집</button>
                </div>
              )}
              {showSourceForm === "figma" && (
                <div className="flex gap-2">
                  <input className="flex-1 rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-indigo-500/50" placeholder="Figma URL" value={figmaUrl} onChange={(e) => setFigmaUrl(e.target.value)} />
                  <button type="button" onClick={handleCollectFigma} disabled={busy} className="rounded-lg bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-300 whitespace-nowrap disabled:opacity-40">수집</button>
                </div>
              )}
              {showSourceForm === "pdf" && (
                <div className="flex gap-2">
                  <input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} className="flex-1 text-sm text-[var(--muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-500/20 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-300" />
                  <button type="button" onClick={handleCollectPdf} disabled={busy || !pdfFile} className="rounded-lg bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-300 whitespace-nowrap disabled:opacity-40">업로드</button>
                </div>
              )}
            </div>
          )}

          {/* Template import form (inline, shown on demand) */}
          {showTemplateForm && (
            <div className="mt-4 rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-4">
              <div className="flex gap-2">
                <input className="flex-1 rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-indigo-500/50" placeholder="Google Sheet URL" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} />
                <button type="button" onClick={handleImportTemplate} disabled={busy || !sheetUrl.trim()} className="rounded-lg bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-300 whitespace-nowrap disabled:opacity-40">분석</button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ─── Generate ─── */}
      {showProjectSections && selectedProjectId && activeProfile && (
        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">TC 생성</span>
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={() => handleGenerateRun("draft")}
                disabled={busy}
                className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-300 transition-colors hover:bg-blue-500/20 disabled:opacity-40"
              >
                초안 생성
              </button>
              <button
                type="button"
                onClick={() => handleGenerateRun("strict")}
                disabled={busy}
                className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-300 transition-colors hover:bg-purple-500/20 disabled:opacity-40"
              >
                엄격 생성
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ─── Runs ─── */}
      {runs.length > 0 && (
        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">실행 이력</h2>
          <div className="space-y-2">
            {runs.map((run) => {
              const vs = run.id === selectedRunId ? validationSummary : null;
              return (
                <div
                  key={run.id}
                  className={`rounded-lg border p-3 transition-colors ${
                    selectedRunId === run.id
                      ? "border-indigo-500/40 bg-indigo-500/[0.06]"
                      : "border-[var(--card-border)] bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Status + mode */}
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                      run.mode === "strict"
                        ? "bg-purple-500/15 text-purple-300"
                        : "bg-blue-500/15 text-blue-300"
                    }`}>
                      {run.mode}
                    </span>
                    <RunStatusBadge status={run.status} />
                    <span className="text-sm font-semibold text-white">{run.totalCases}건</span>
                    <span className="text-xs text-[var(--muted)]">{formatDate(run.createdAt)}</span>

                    {/* Actions */}
                    <div className="ml-auto flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleValidateRun(run.id)}
                        disabled={busy}
                        className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-40"
                      >
                        검증
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadCsv(run.id)}
                        disabled={busy}
                        className="rounded-md border border-[var(--card-border)] bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.08] disabled:opacity-40"
                      >
                        CSV
                      </button>
                      <Link
                        href={`/tc/runs/${run.id}`}
                        className="rounded-md border border-[var(--card-border)] bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.08]"
                      >
                        상세
                      </Link>
                    </div>
                  </div>

                  {/* Validation summary (inline, if available) */}
                  {vs && run.id === selectedRunId && (
                    <div className="mt-2 flex gap-3 text-[10px] text-[var(--muted)]">
                      <span>중복 <strong className={vs.duplicateCount > 0 ? "text-amber-400" : "text-slate-400"}>{vs.duplicateCount}</strong></span>
                      <span>누락 <strong className={vs.missingCount > 0 ? "text-rose-400" : "text-slate-400"}>{vs.missingCount}</strong></span>
                      <span>포맷 <strong className={vs.formatCount > 0 ? "text-amber-400" : "text-slate-400"}>{vs.formatCount}</strong></span>
                      <span>커버리지 <strong className="text-slate-300">{pct(vs.coverageRatio)}</strong></span>
                    </div>
                  )}

                  {run.errorMessage && (
                    <p className="mt-2 text-[10px] text-rose-400">{run.errorMessage}</p>
                  )}

                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Badge({ label, color }: { label: string; color: "blue" | "purple" | "slate" }) {
  const colors = {
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    purple: "border-purple-500/20 bg-purple-500/10 text-purple-300",
    slate: "border-[var(--card-border)] bg-white/5 text-slate-300",
  };
  return (
    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${colors[color]}`}>
      {label}
    </span>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  const config: Record<string, { dot: string; text: string }> = {
    completed: { dot: "bg-emerald-400", text: "text-emerald-400" },
    running: { dot: "bg-indigo-400 animate-pulse", text: "text-indigo-400" },
    queued: { dot: "bg-slate-400", text: "text-slate-400" },
    failed: { dot: "bg-rose-400", text: "text-rose-400" },
  };
  const c = config[status] || config.queued;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}
