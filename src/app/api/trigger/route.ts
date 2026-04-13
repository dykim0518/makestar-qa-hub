import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "octokit";

const VALID_SUITES = ["cmr", "albumbuddy", "admin", "all"];
const VALID_ENVIRONMENTS = ["prod", "stg"];
const MAX_QUEUED_RUNS = 5;

// Shell 메타문자 차단용 엄격한 화이트리스트. workflow YAML에서 이 값들이
// bash로 전달될 때 명령어 인젝션을 방지한다.
const SAFE_INPUT_PATTERN = /^[A-Za-z0-9_\-./@ :]*$/;
const MAX_INPUT_LENGTH = 200;

function validateSafeInput(
  name: string,
  value: unknown,
): { ok: true; value: string } | { ok: false; error: string } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: "" };
  }
  if (typeof value !== "string") {
    return { ok: false, error: `${name} must be a string` };
  }
  if (value.length > MAX_INPUT_LENGTH) {
    return { ok: false, error: `${name} exceeds ${MAX_INPUT_LENGTH} chars` };
  }
  if (!SAFE_INPUT_PATTERN.test(value)) {
    return {
      ok: false,
      error: `${name} contains disallowed characters`,
    };
  }
  return { ok: true, value };
}

// Same-origin 검증: 브라우저 UI에서만 호출되도록 제한.
// 공격자가 curl로 위조 가능하지만 스크립트 키디/자동화 봇 차단에 유효.
function checkSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");
  if (!host) return false;

  const allowedHosts = new Set<string>([host]);
  const extra = process.env.ALLOWED_ORIGIN_HOSTS;
  if (extra) extra.split(",").forEach((h) => allowedHosts.add(h.trim()));

  const candidates = [origin, referer].filter((v): v is string => !!v);
  if (candidates.length === 0) return false;

  return candidates.every((value) => {
    try {
      const url = new URL(value);
      return allowedHosts.has(url.host);
    } catch {
      return false;
    }
  });
}

export async function POST(request: NextRequest) {
  if (!checkSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  const projectCheck = validateSafeInput("project", project);
  if (!projectCheck.ok) {
    return NextResponse.json({ error: projectCheck.error }, { status: 400 });
  }
  const specCheck = validateSafeInput("spec", spec);
  if (!specCheck.ok) {
    return NextResponse.json({ error: specCheck.error }, { status: 400 });
  }
  const grepCheck = validateSafeInput("grep", grep);
  if (!grepCheck.ok) {
    return NextResponse.json({ error: grepCheck.error }, { status: 400 });
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
        project: projectCheck.value,
        spec: specCheck.value,
        grep: grepCheck.value,
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
    console.error("[/api/trigger] GitHub API error:", error);
    return NextResponse.json(
      { error: "GitHub API 호출 실패" },
      { status: 502 },
    );
  }
}
