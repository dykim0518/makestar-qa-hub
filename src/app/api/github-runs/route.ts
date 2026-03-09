import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "octokit";

export async function GET(request: NextRequest) {
  const pat = process.env.GITHUB_PAT;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;

  if (!pat || !owner || !repo) {
    return NextResponse.json(
      { error: "GitHub credentials not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "5", 10), 20);

  const octokit = new Octokit({ auth: pat });

  try {
    const { data } = await octokit.rest.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: "playwright.yml",
      per_page: limit,
    });

    const runs = data.workflow_runs.map((run) => ({
      id: run.id,
      status: run.status, // queued | in_progress | completed
      conclusion: run.conclusion, // success | failure | cancelled | null
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      htmlUrl: run.html_url,
      branch: run.head_branch,
      event: run.event,
      runNumber: run.run_number,
      // workflow_dispatch inputs 추출
      displayName: run.display_title || `Run #${run.run_number}`,
    }));

    return NextResponse.json(runs);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `GitHub API error: ${message}` },
      { status: 502 }
    );
  }
}
