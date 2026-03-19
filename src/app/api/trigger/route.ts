import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "octokit";

const VALID_SUITES = ["cmr", "albumbuddy", "admin", "all"];
const VALID_ENVIRONMENTS = ["prod", "stg"];
const MAX_QUEUED_RUNS = 5;

export async function POST(request: NextRequest) {
  const pat = process.env.GITHUB_PAT;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;

  if (!pat || !owner || !repo) {
    return NextResponse.json(
      { error: "Server misconfigured: GitHub credentials not set" },
      { status: 500 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { suite, project, spec, grep, retries, environment } = body;

  if (!suite || !VALID_SUITES.includes(suite)) {
    return NextResponse.json(
      { error: `Invalid suite. Must be one of: ${VALID_SUITES.join(", ")}` },
      { status: 400 },
    );
  }

  const retriesNum = parseInt(retries ?? "1", 10);
  if (isNaN(retriesNum) || retriesNum < 0 || retriesNum > 5) {
    return NextResponse.json({ error: "retries must be 0-5" }, { status: 400 });
  }

  const envValue = environment || "prod";
  if (!VALID_ENVIRONMENTS.includes(envValue)) {
    return NextResponse.json(
      {
        error: `Invalid environment. Must be one of: ${VALID_ENVIRONMENTS.join(", ")}`,
      },
      { status: 400 },
    );
  }

  const octokit = new Octokit({ auth: pat });

  try {
    // 큐 제한: 대기 중(queued) + 실행 중(in_progress) run 수 확인
    const { data } = await octokit.rest.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: "playwright.yml",
      per_page: 10,
    });

    const activeRuns = data.workflow_runs.filter(
      (run) => run.status === "queued" || run.status === "in_progress",
    );

    if (activeRuns.length >= MAX_QUEUED_RUNS) {
      return NextResponse.json(
        {
          ok: false,
          error: `큐가 가득 찼습니다 (${activeRuns.length}/${MAX_QUEUED_RUNS}). 진행 중인 테스트가 완료된 후 다시 시도해주세요.`,
        },
        { status: 429 },
      );
    }

    await octokit.rest.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: "playwright.yml",
      ref: "main",
      inputs: {
        suite,
        environment: envValue,
        project: project || "",
        spec: spec || "",
        grep: grep || "",
        retries: String(retriesNum),
      },
    });

    const actionsUrl = `https://github.com/${owner}/${repo}/actions/workflows/playwright.yml`;
    const queuePosition = activeRuns.length;

    return NextResponse.json({
      ok: true,
      message:
        queuePosition > 0
          ? `${suite} 테스트 큐에 추가됨 (${envValue.toUpperCase()}, 대기 ${queuePosition}건)`
          : `${suite} 테스트 트리거 성공 (${envValue.toUpperCase()})`,
      actionsUrl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `GitHub API 호출 실패: ${message}` },
      { status: 502 },
    );
  }
}
