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

interface GoogleIntegrationStatus {
  configured: boolean;
  hasEmail: boolean;
  hasPrivateKey: boolean;
  subjectConfigured: boolean;
  serviceAccountEmailMasked: string | null;
}

const CANONICAL_ORDER = [
  "No",
  "Traceability",
  "Depth 1",
  "Depth 2",
  "Depth 3",
  "Pre-Condition",
  "Step",
  "Expected Result",
  "Result",
  "Issue Key",
  "Description",
];

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
  const showRunSection = true;

  const [projects, setProjects] = useState<TcProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [sources, setSources] = useState<TcSource[]>([]);
  const [requirements, setRequirements] = useState<TcRequirement[]>([]);
  const [profiles, setProfiles] = useState<TcTemplateProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [runs, setRuns] = useState<TcGenerationRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>(initialRunId);
  const [runCases, setRunCases] = useState<TcGeneratedCase[]>([]);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(
    null
  );
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [validationCoverage, setValidationCoverage] = useState<CoverageItem[]>([]);
  const [googleStatus, setGoogleStatus] = useState<GoogleIntegrationStatus | null>(
    null
  );

  const [newProjectName, setNewProjectName] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [csvText, setCsvText] = useState("");
  const [importName, setImportName] = useState("");
  const [notionUrl, setNotionUrl] = useState("");
  const [notionRawText, setNotionRawText] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [figmaFileKey, setFigmaFileKey] = useState("");
  const [figmaNodeId, setFigmaNodeId] = useState("");
  const [figmaMetaText, setFigmaMetaText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [exportSheetTarget, setExportSheetTarget] = useState("");
  const [tcSheetName, setTcSheetName] = useState("TC");
  const [validationSheetName, setValidationSheetName] = useState("Validation_Report");
  const [coverageSheetName, setCoverageSheetName] = useState("Coverage_Matrix");
  const [exportedSheetUrl, setExportedSheetUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  );
  const selectedRun = useMemo(
    () => runs.find((run) => run.id === selectedRunId) ?? null,
    [runs, selectedRunId]
  );

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

  const fetchGoogleStatus = useCallback(async () => {
    const res = await fetch("/api/tc/integrations/google/status");
    if (!res.ok) return;
    const data = await res.json();
    setGoogleStatus(data);
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
    fetchGoogleStatus();
  }, [fetchProjects, fetchGoogleStatus]);

  useEffect(() => {
    if (!selectedProjectId) return;
    fetchSources(selectedProjectId);
    fetchRequirements(selectedProjectId);
    fetchProfiles(selectedProjectId);
    fetchRuns(selectedProjectId);
  }, [
    selectedProjectId,
    fetchSources,
    fetchRequirements,
    fetchProfiles,
    fetchRuns,
  ]);

  useEffect(() => {
    if (!selectedRunId) return;
    fetchRunCases(selectedRunId);
    fetchValidation(selectedRunId);
  }, [selectedRunId, fetchRunCases, fetchValidation]);

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
      if (!res.ok) {
        setMessage(data.error || "프로젝트 생성 실패");
        return;
      }
      setNewProjectName("");
      setMessage("프로젝트를 생성했습니다.");
      await fetchProjects();
      if (data.project?.id) {
        setSelectedProjectId(data.project.id);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleCollectNotion() {
    if (!selectedProjectId) {
      setMessage("프로젝트를 먼저 선택하세요.");
      return;
    }
    if (!notionUrl.trim()) {
      setMessage("Notion URL을 입력하세요.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(
        `/api/tc/projects/${selectedProjectId}/sources/notion`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: notionUrl.trim(),
            rawText: notionRawText.trim() || undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Notion 소스 수집 실패");
        return;
      }
      setMessage(`Notion 소스 수집 완료 (요구사항 ${data.insertedRequirements ?? 0}건)`);
      await Promise.all([
        fetchSources(selectedProjectId),
        fetchRequirements(selectedProjectId),
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function handleCollectFigma() {
    if (!selectedProjectId) {
      setMessage("프로젝트를 먼저 선택하세요.");
      return;
    }
    if (!figmaUrl.trim() && !figmaFileKey.trim()) {
      setMessage("Figma URL 또는 File Key를 입력하세요.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(
        `/api/tc/projects/${selectedProjectId}/sources/figma`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: figmaUrl.trim() || undefined,
            fileKey: figmaFileKey.trim() || undefined,
            nodeId: figmaNodeId.trim() || undefined,
            metadataText: figmaMetaText.trim() || undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Figma 소스 수집 실패");
        return;
      }
      setMessage(`Figma 소스 수집 완료 (요구사항 ${data.insertedRequirements ?? 0}건)`);
      await Promise.all([
        fetchSources(selectedProjectId),
        fetchRequirements(selectedProjectId),
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function handleCollectPdf() {
    if (!selectedProjectId) {
      setMessage("프로젝트를 먼저 선택하세요.");
      return;
    }
    if (!pdfFile) {
      setMessage("PDF 파일을 선택하세요.");
      return;
    }

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
      if (!res.ok) {
        setMessage(data.error || "PDF 소스 수집 실패");
        return;
      }
      setMessage(`PDF 소스 수집 완료 (요구사항 ${data.insertedRequirements ?? 0}건)`);
      await Promise.all([
        fetchSources(selectedProjectId),
        fetchRequirements(selectedProjectId),
      ]);
      setPdfFile(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleImportTemplate() {
    if (!selectedProjectId) {
      setMessage("프로젝트를 먼저 선택하세요.");
      return;
    }
    if (!sheetUrl.trim() && !csvText.trim()) {
      setMessage("Google Sheet URL 또는 CSV 본문이 필요합니다.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(
        `/api/tc/projects/${selectedProjectId}/template/import-google-sheet`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheetUrl: sheetUrl.trim() || undefined,
            csvText: csvText.trim() || undefined,
            name: importName.trim() || undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "템플릿 분석 실패");
        return;
      }
      setMessage("템플릿 프로파일 초안을 생성했습니다.");
      await fetchProfiles(selectedProjectId);
      if (data.profile?.id) {
        setSelectedProfileId(data.profile.id);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleApproveProfile() {
    if (!selectedProjectId || !selectedProfileId) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(
        `/api/tc/projects/${selectedProjectId}/template/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId: selectedProfileId }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "프로파일 승인 실패");
        return;
      }
      setMessage("템플릿 프로파일을 승인했습니다.");
      await fetchProfiles(selectedProjectId);
      if (data.profile?.id) {
        setSelectedProfileId(data.profile.id);
      }
    } finally {
      setBusy(false);
    }
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
        body: JSON.stringify({
          profileId: selectedProfileId,
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "TC 생성 실행 실패");
        return;
      }
      setMessage(`TC 생성 완료: ${data.totalGeneratedCases ?? 0}건`);
      await fetchRuns(selectedProjectId);
      if (data.run?.id) {
        setSelectedRunId(data.run.id);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleValidateRun() {
    if (!selectedRunId) {
      setMessage("검증할 실행을 선택하세요.");
      return;
    }
    setBusy(true);
    setMessage("");
    setExportedSheetUrl(null);
    try {
      const res = await fetch(`/api/tc/runs/${selectedRunId}/validate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "검증 실행 실패");
        return;
      }
      setValidationSummary(data.summary ?? null);
      setValidationIssues(data.issues ?? []);
      setValidationCoverage(data.coverage ?? []);
      setMessage(`검증 완료: 이슈 ${data.issueCount ?? 0}건`);
    } finally {
      setBusy(false);
    }
  }

  async function handleExportGoogleSheet() {
    if (!selectedRunId) {
      setMessage("내보낼 실행을 선택하세요.");
      return;
    }
    if (!exportSheetTarget.trim()) {
      setMessage("Google Sheet URL 또는 Spreadsheet ID를 입력하세요.");
      return;
    }
    if (!googleStatus?.configured) {
      setMessage(
        "Google Sheets 연동 키가 설정되지 않았습니다. GOOGLE_SERVICE_ACCOUNT_EMAIL/PRIVATE_KEY를 확인하세요."
      );
      return;
    }

    setBusy(true);
    setMessage("");
    setExportedSheetUrl(null);
    try {
      const res = await fetch(`/api/tc/runs/${selectedRunId}/export/google-sheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetUrl: exportSheetTarget.trim(),
          tcSheetName: tcSheetName.trim(),
          validationSheetName: validationSheetName.trim(),
          coverageSheetName: coverageSheetName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Google Sheet 내보내기 실패");
        return;
      }
      setExportedSheetUrl(data.spreadsheetUrl || null);
      setMessage("Google Sheet 내보내기가 완료되었습니다.");
      await fetchValidation(selectedRunId);
    } finally {
      setBusy(false);
    }
  }

  function handleDownloadTcCsv() {
    if (!selectedRunId) {
      setMessage("내보낼 실행을 선택하세요.");
      return;
    }
    if (runCases.length === 0) {
      setMessage("다운로드할 TC 데이터가 없습니다.");
      return;
    }

    const rows: Array<Array<unknown>> = [
      [
        "No",
        "Traceability",
        "Depth 1",
        "Depth 2",
        "Depth 3",
        "Pre-Condition",
        "Step",
        "Expected Result",
        "Result",
        "Issue Key",
        "Description",
      ],
      ...runCases.map((testCase, index) => [
        testCase.no || `AUTO_${String(index + 1).padStart(4, "0")}`,
        testCase.traceability || "",
        testCase.depth1 || "",
        testCase.depth2 || "",
        testCase.depth3 || "",
        testCase.preCondition || "",
        testCase.step,
        testCase.expectedResult,
        testCase.result,
        testCase.issueKey || "",
        testCase.description || "",
      ]),
    ];

    const filename = `tc_cases_${selectedRunId.slice(0, 8)}.csv`;
    triggerCsvDownload(filename, rows);
    setMessage(`TC CSV 다운로드 완료: ${filename}`);
  }

  function handleDownloadValidationCsv() {
    if (!selectedRunId) {
      setMessage("내보낼 실행을 선택하세요.");
      return;
    }
    if (!validationSummary) {
      setMessage("검증 결과가 없습니다. 먼저 검증 실행을 눌러주세요.");
      return;
    }

    const rows: Array<Array<unknown>> = [
      ["Metric", "Value"],
      ["Run ID", selectedRunId],
      ["Total Cases", validationSummary.totalCases],
      ["Issue Count", validationSummary.issueCount],
      ["Duplicate Count", validationSummary.duplicateCount],
      ["Missing Count", validationSummary.missingCount],
      ["Format Count", validationSummary.formatCount],
      ["Coverage Ratio", pct(validationSummary.coverageRatio)],
      [],
      ["Issue Type", "Severity", "Target", "Message"],
      ...validationIssues.map((issue) => [
        issue.issueType,
        issue.severity,
        issue.targetRef || "",
        issue.message,
      ]),
    ];

    const filename = `validation_${selectedRunId.slice(0, 8)}.csv`;
    triggerCsvDownload(filename, rows);
    setMessage(`Validation CSV 다운로드 완료: ${filename}`);
  }

  function handleDownloadCoverageCsv() {
    if (!selectedRunId) {
      setMessage("내보낼 실행을 선택하세요.");
      return;
    }
    if (validationCoverage.length === 0) {
      setMessage("Coverage 데이터가 없습니다. 먼저 검증 실행을 눌러주세요.");
      return;
    }

    const rows: Array<Array<unknown>> = [
      ["Requirement Key", "Requirement Title", "Covered", "Case Refs"],
      ...validationCoverage.map((item) => [
        item.requirementKey,
        item.requirementTitle,
        item.covered ? "YES" : "NO",
        item.caseRefs.join(", "),
      ]),
    ];

    const filename = `coverage_${selectedRunId.slice(0, 8)}.csv`;
    triggerCsvDownload(filename, rows);
    setMessage(`Coverage CSV 다운로드 완료: ${filename}`);
  }

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200">
          {message}
        </div>
      ) : null}

      {showProjectSections ? (
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          프로젝트
        </h2>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row">
          <input
            className="w-full rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-indigo-500/50"
            placeholder="새 프로젝트 이름"
            value={newProjectName}
            onChange={(event) => setNewProjectName(event.target.value)}
          />
          <button
            type="button"
            onClick={handleCreateProject}
            disabled={busy}
            className="rounded-lg bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-300 disabled:opacity-60"
          >
            프로젝트 생성
          </button>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs text-[var(--muted)]">선택 프로젝트</label>
          <select
            className="w-full rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-indigo-500/50"
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
          >
            <option value="">프로젝트 선택</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        {selectedProjectId ? (
          <div className="mt-2">
            <Link
              href={`/tc/projects/${selectedProjectId}`}
              className="text-xs font-semibold text-indigo-300 hover:text-indigo-200"
            >
              프로젝트 전용 화면 열기
            </Link>
          </div>
        ) : null}
      </section>
      ) : null}

      {showProjectSections ? (
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Source Ingest (Notion / PDF / Figma)
        </h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-3">
            <p className="text-xs font-semibold text-slate-200">Notion</p>
            <input
              className="mt-2 w-full rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-2 text-xs outline-none focus:border-indigo-500/50"
              placeholder="Notion URL"
              value={notionUrl}
              onChange={(event) => setNotionUrl(event.target.value)}
            />
            <textarea
              className="mt-2 h-24 w-full rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-2 text-xs outline-none focus:border-indigo-500/50"
              placeholder="정규화용 텍스트(선택)"
              value={notionRawText}
              onChange={(event) => setNotionRawText(event.target.value)}
            />
            <button
              type="button"
              onClick={handleCollectNotion}
              disabled={busy || !selectedProjectId}
              className="mt-2 w-full rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-300 disabled:opacity-60"
            >
              Notion 연결
            </button>
          </div>

          <div className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-3">
            <p className="text-xs font-semibold text-slate-200">Figma</p>
            <input
              className="mt-2 w-full rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-2 text-xs outline-none focus:border-indigo-500/50"
              placeholder="Figma URL (선택)"
              value={figmaUrl}
              onChange={(event) => setFigmaUrl(event.target.value)}
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-2 text-xs outline-none focus:border-indigo-500/50"
                placeholder="File Key"
                value={figmaFileKey}
                onChange={(event) => setFigmaFileKey(event.target.value)}
              />
              <input
                className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-2 text-xs outline-none focus:border-indigo-500/50"
                placeholder="Node ID"
                value={figmaNodeId}
                onChange={(event) => setFigmaNodeId(event.target.value)}
              />
            </div>
            <textarea
              className="mt-2 h-16 w-full rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-2 text-xs outline-none focus:border-indigo-500/50"
              placeholder="메타 텍스트(선택)"
              value={figmaMetaText}
              onChange={(event) => setFigmaMetaText(event.target.value)}
            />
            <button
              type="button"
              onClick={handleCollectFigma}
              disabled={busy || !selectedProjectId}
              className="mt-2 w-full rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-300 disabled:opacity-60"
            >
              Figma 연결
            </button>
          </div>

          <div className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-3">
            <p className="text-xs font-semibold text-slate-200">PDF</p>
            <label className="mt-2 block rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-2 text-xs text-[var(--muted)]">
              <input
                type="file"
                accept="application/pdf"
                className="w-full cursor-pointer text-xs"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setPdfFile(file);
                }}
              />
            </label>
            <p className="mt-2 truncate text-xs text-[var(--muted)]">
              {pdfFile?.name || "선택된 파일 없음"}
            </p>
            <button
              type="button"
              onClick={handleCollectPdf}
              disabled={busy || !selectedProjectId}
              className="mt-2 w-full rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-300 disabled:opacity-60"
            >
              PDF 업로드
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-3 text-xs">
            <p className="text-sm font-semibold text-white">수집된 소스</p>
            {sources.length === 0 ? (
              <p className="mt-2 text-[var(--muted)]">아직 소스가 없습니다.</p>
            ) : (
              <div className="mt-2 overflow-auto">
                <table className="min-w-[540px] text-xs">
                  <thead>
                    <tr>
                      {["Type", "Status", "Title/Ref", "Created"].map((header) => (
                        <th
                          key={header}
                          className="border-b border-[var(--card-border)] px-2 py-1 text-left text-[var(--muted)]"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sources.slice(0, 20).map((source) => (
                      <tr key={source.id}>
                        <td className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200">
                          {source.sourceType}
                        </td>
                        <td className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200">
                          {source.sourceStatus}
                        </td>
                        <td className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200">
                          {source.sourceTitle || source.sourceRef}
                        </td>
                        <td className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200">
                          {formatDate(source.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-3 text-xs">
            <p className="text-sm font-semibold text-white">정규화된 Requirement</p>
            {requirements.length === 0 ? (
              <p className="mt-2 text-[var(--muted)]">아직 requirement가 없습니다.</p>
            ) : (
              <div className="mt-2 overflow-auto">
                <table className="min-w-[560px] text-xs">
                  <thead>
                    <tr>
                      {["Key", "Title", "Priority", "Tags"].map((header) => (
                        <th
                          key={header}
                          className="border-b border-[var(--card-border)] px-2 py-1 text-left text-[var(--muted)]"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {requirements.slice(0, 30).map((requirement) => (
                      <tr key={requirement.id}>
                        <td className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200">
                          {requirement.requirementKey || "-"}
                        </td>
                        <td className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200">
                          {requirement.title}
                        </td>
                        <td className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200">
                          {requirement.priority || "-"}
                        </td>
                        <td className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200">
                          {(requirement.tags || []).join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
      ) : null}

      {showProjectSections ? (
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Template Import (Google Sheet)
        </h2>
        <div className="mt-3 grid gap-3">
          <input
            className="w-full rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-indigo-500/50"
            placeholder="Google Sheet URL"
            value={sheetUrl}
            onChange={(event) => setSheetUrl(event.target.value)}
          />
          <input
            className="w-full rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-indigo-500/50"
            placeholder="프로파일 이름 (선택)"
            value={importName}
            onChange={(event) => setImportName(event.target.value)}
          />
          <textarea
            className="h-32 w-full rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-2 text-xs outline-none focus:border-indigo-500/50"
            placeholder="또는 CSV 내용을 직접 붙여넣기"
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleImportTemplate}
              disabled={busy || !selectedProjectId}
              className="rounded-lg bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-300 disabled:opacity-60"
            >
              템플릿 분석
            </button>
            <button
              type="button"
              onClick={handleApproveProfile}
              disabled={busy || !selectedProfileId}
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 disabled:opacity-60"
            >
              선택 프로파일 승인
            </button>
            <button
              type="button"
              onClick={() => handleGenerateRun("draft")}
              disabled={busy || !selectedProfileId}
              className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-300 disabled:opacity-60"
            >
              TC 초안 생성
            </button>
            <button
              type="button"
              onClick={() => handleGenerateRun("strict")}
              disabled={busy || !selectedProfileId}
              className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-300 disabled:opacity-60"
            >
              TC 엄격 생성
            </button>
          </div>
        </div>
      </section>
      ) : null}

      {showProjectSections ? (
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Template Profiles
        </h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            {profiles.length === 0 ? (
              <div className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-3 text-xs text-[var(--muted)]">
                프로파일이 없습니다.
              </div>
            ) : (
              profiles.map((profile) => (
                <button
                  type="button"
                  key={profile.id}
                  onClick={() => setSelectedProfileId(profile.id)}
                  className={`w-full rounded-lg border p-3 text-left ${
                    selectedProfileId === profile.id
                      ? "border-indigo-500/50 bg-indigo-500/10"
                      : "border-[var(--card-border)] bg-white/[0.02]"
                  }`}
                >
                  <p className="text-sm font-semibold text-white">{profile.name}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    상태: {profile.status} / 헤더행: {profile.headerRowIndex + 1}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="space-y-4">
            {selectedProfile ? (
              <>
                <div className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-3">
                  <p className="text-sm font-semibold text-white">컬럼 매핑</p>
                  <div className="mt-2 grid gap-1 text-xs">
                    {CANONICAL_ORDER.map((canonical) => {
                      const match = selectedProfile.columnMapping?.find(
                        (item) => item.canonical === canonical
                      );
                      return (
                        <div key={canonical} className="grid grid-cols-[130px_1fr] gap-2">
                          <span className="text-[var(--muted)]">{canonical}</span>
                          <span className="text-slate-200">
                            {match ? `${match.header} (col ${match.index + 1})` : "-"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-3 text-xs">
                  <p className="text-sm font-semibold text-white">스타일 프로파일</p>
                  <div className="mt-2 grid gap-1 text-[var(--muted)]">
                    <p>Step 행위형 비율: {pct(selectedProfile.styleProfile?.stepImperativeRatio ?? 0)}</p>
                    <p>Expected 상태형 비율: {pct(selectedProfile.styleProfile?.expectedStateRatio ?? 0)}</p>
                    <p>
                      1셀 1기대결과 비율:{" "}
                      {pct(selectedProfile.styleProfile?.singleExpectedPerCellRatio ?? 0)}
                    </p>
                    <p>
                      Step 키워드:{" "}
                      {(selectedProfile.styleProfile?.commonStepVerbs ?? []).join(", ") || "-"}
                    </p>
                    <p>
                      Expected 키워드:{" "}
                      {(selectedProfile.styleProfile?.commonExpectedSuffixes ?? []).join(", ") || "-"}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-3">
                  <p className="text-sm font-semibold text-white">미리보기 (최대 20행)</p>
                  <div className="mt-2 overflow-auto">
                    <table className="min-w-[900px] text-xs">
                      <thead>
                        <tr>
                          {CANONICAL_ORDER.map((header) => (
                            <th
                              key={header}
                              className="border-b border-[var(--card-border)] px-2 py-1 text-left text-[var(--muted)]"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedProfile.previewRows ?? []).map((row, index) => (
                          <tr key={`${selectedProfile.id}-${index}`}>
                            {CANONICAL_ORDER.map((header) => (
                              <td
                                key={header}
                                className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200"
                              >
                                {row[header] ?? ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-3 text-xs text-[var(--muted)]">
                프로파일을 선택하세요.
              </div>
            )}
          </div>
        </div>
      </section>
      ) : null}

      {showRunSection ? (
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Generation Runs
        </h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            {runs.length === 0 ? (
              <div className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-3 text-xs text-[var(--muted)]">
                실행 이력이 없습니다.
              </div>
            ) : (
              runs.map((run) => (
                <button
                  type="button"
                  key={run.id}
                  onClick={() => setSelectedRunId(run.id)}
                  className={`w-full rounded-lg border p-3 text-left ${
                    selectedRunId === run.id
                      ? "border-indigo-500/50 bg-indigo-500/10"
                      : "border-[var(--card-border)] bg-white/[0.02]"
                  }`}
                >
                  <p className="text-sm font-semibold text-white">
                    {run.mode.toUpperCase()} / {run.status}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Cases: {run.totalCases} / {formatDate(run.createdAt)}
                  </p>
                  <p className="mt-1 text-xs">
                    <Link
                      href={`/tc/runs/${run.id}`}
                      className="font-semibold text-indigo-300 hover:text-indigo-200"
                    >
                      Run 상세 화면 열기
                    </Link>
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="space-y-3">
            {selectedRun ? (
              <>
                <div className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-3 text-xs text-[var(--muted)]">
                  <p>Run ID: {selectedRun.id}</p>
                  <p>Status: {selectedRun.status}</p>
                  <p>Total Cases: {selectedRun.totalCases}</p>
                  {selectedRun.errorMessage ? (
                    <p className="text-red-300">Error: {selectedRun.errorMessage}</p>
                  ) : null}
                </div>

                <div className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-3">
                  <p className="text-sm font-semibold text-white">검증 및 내보내기</p>
                  {googleStatus?.configured ? (
                    <p className="mt-2 text-xs text-emerald-300">
                      Google Sheets 연동 준비됨 ({googleStatus.serviceAccountEmailMasked})
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-amber-300">
                      Google Sheets 연동 미설정:{" "}
                      {!googleStatus?.hasEmail ? "GOOGLE_SERVICE_ACCOUNT_EMAIL " : ""}
                      {!googleStatus?.hasPrivateKey
                        ? "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"
                        : ""}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleValidateRun}
                      disabled={busy}
                      className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 disabled:opacity-60"
                    >
                      검증 실행
                    </button>
                    <input
                      className="min-w-[300px] flex-1 rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-1.5 text-xs outline-none focus:border-indigo-500/50"
                      placeholder="Google Sheet URL 또는 Spreadsheet ID"
                      value={exportSheetTarget}
                      onChange={(event) => setExportSheetTarget(event.target.value)}
                    />
                  </div>
                  <div className="mt-2 grid gap-2 lg:grid-cols-3">
                    <input
                      className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-1.5 text-xs outline-none focus:border-indigo-500/50"
                      placeholder="TC 시트명"
                      value={tcSheetName}
                      onChange={(event) => setTcSheetName(event.target.value)}
                    />
                    <input
                      className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-1.5 text-xs outline-none focus:border-indigo-500/50"
                      placeholder="Validation 시트명"
                      value={validationSheetName}
                      onChange={(event) => setValidationSheetName(event.target.value)}
                    />
                    <input
                      className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] px-3 py-1.5 text-xs outline-none focus:border-indigo-500/50"
                      placeholder="Coverage 시트명"
                      value={coverageSheetName}
                      onChange={(event) => setCoverageSheetName(event.target.value)}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleExportGoogleSheet}
                      disabled={busy || !googleStatus?.configured}
                      className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 disabled:opacity-60"
                    >
                      Google Sheet 내보내기
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadTcCsv}
                      disabled={busy || !selectedRunId}
                      className="rounded-lg border border-slate-500/40 bg-slate-500/10 px-3 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-60"
                    >
                      TC CSV 다운로드
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadValidationCsv}
                      disabled={busy || !selectedRunId}
                      className="rounded-lg border border-slate-500/40 bg-slate-500/10 px-3 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-60"
                    >
                      Validation CSV 다운로드
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadCoverageCsv}
                      disabled={busy || !selectedRunId}
                      className="rounded-lg border border-slate-500/40 bg-slate-500/10 px-3 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-60"
                    >
                      Coverage CSV 다운로드
                    </button>
                  </div>
                  {exportedSheetUrl ? (
                    <p className="mt-2 text-xs text-emerald-300">
                      Export URL:{" "}
                      <a
                        href={exportedSheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2"
                      >
                        {exportedSheetUrl}
                      </a>
                    </p>
                  ) : null}
                </div>

                <div className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-3 text-xs">
                  <p className="text-sm font-semibold text-white">Validation Report</p>
                  {validationSummary ? (
                    <div className="mt-2 grid gap-1 text-[var(--muted)]">
                      <p>Total Cases: {validationSummary.totalCases}</p>
                      <p>Issue Count: {validationSummary.issueCount}</p>
                      <p>Duplicate: {validationSummary.duplicateCount}</p>
                      <p>Missing: {validationSummary.missingCount}</p>
                      <p>Format: {validationSummary.formatCount}</p>
                      <p>Coverage: {pct(validationSummary.coverageRatio)}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-[var(--muted)]">
                      아직 검증 결과가 없습니다. 검증 실행 버튼을 눌러주세요.
                    </p>
                  )}
                  {validationIssues.length > 0 ? (
                    <div className="mt-3 overflow-auto">
                      <table className="min-w-[760px] text-xs">
                        <thead>
                          <tr>
                            {["Type", "Severity", "Target", "Message"].map((header) => (
                              <th
                                key={header}
                                className="border-b border-[var(--card-border)] px-2 py-1 text-left text-[var(--muted)]"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {validationIssues.slice(0, 30).map((issue, index) => (
                            <tr key={`${issue.issueType}-${issue.targetRef}-${index}`}>
                              <td className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200">
                                {issue.issueType}
                              </td>
                              <td className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200">
                                {issue.severity}
                              </td>
                              <td className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200">
                                {issue.targetRef || ""}
                              </td>
                              <td className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200">
                                {issue.message}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                  {validationCoverage.length > 0 ? (
                    <div className="mt-3 overflow-auto">
                      <p className="mb-2 text-sm font-semibold text-white">Coverage Matrix</p>
                      <table className="min-w-[760px] text-xs">
                        <thead>
                          <tr>
                            {["Requirement Key", "Requirement Title", "Covered", "Case Refs"].map(
                              (header) => (
                                <th
                                  key={header}
                                  className="border-b border-[var(--card-border)] px-2 py-1 text-left text-[var(--muted)]"
                                >
                                  {header}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {validationCoverage.slice(0, 50).map((item, index) => (
                            <tr key={`${item.requirementKey}-${index}`}>
                              <td className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200">
                                {item.requirementKey}
                              </td>
                              <td className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200">
                                {item.requirementTitle}
                              </td>
                              <td className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200">
                                {item.covered ? "YES" : "NO"}
                              </td>
                              <td className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200">
                                {item.caseRefs.join(", ")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-3">
                  <p className="text-sm font-semibold text-white">생성된 TC 미리보기</p>
                  <div className="mt-2 overflow-auto">
                    <table className="min-w-[900px] text-xs">
                      <thead>
                        <tr>
                          {["Traceability", "Depth1", "Depth2", "Depth3", "Step", "Expected"].map(
                            (header) => (
                              <th
                                key={header}
                                className="border-b border-[var(--card-border)] px-2 py-1 text-left text-[var(--muted)]"
                              >
                                {header}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {runCases.slice(0, 30).map((testCase) => (
                          <tr key={testCase.id}>
                            <td className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200">
                              {testCase.traceability || ""}
                            </td>
                            <td className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200">
                              {testCase.depth1 || ""}
                            </td>
                            <td className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200">
                              {testCase.depth2 || ""}
                            </td>
                            <td className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200">
                              {testCase.depth3 || ""}
                            </td>
                            <td className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200">
                              {testCase.step}
                            </td>
                            <td className="border-b border-[var(--card-border)] px-2 py-1 text-slate-200">
                              {testCase.expectedResult}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-[var(--card-border)] bg-white/[0.02] p-3 text-xs text-[var(--muted)]">
                실행을 선택하세요.
              </div>
            )}
          </div>
        </div>
      </section>
      ) : null}
    </div>
  );
}
