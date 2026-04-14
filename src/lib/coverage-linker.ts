/**
 * 테스트 결과 → 기능 커버리지 매핑.
 *
 * 태그 규약:
 *   @feature:{product}.{category}.{feature}
 *   예) @feature:admin.orders.cancel
 *
 * Playwright 테스트에서 describe tag 옵션으로 지정:
 *   test.describe("주문 취소", { tag: "@feature:admin.orders.cancel" }, () => { ... });
 *
 * tag는 test_cases.title에 문자열로 포함되거나 titlePath로 결합되어 들어옴.
 */
import { db } from "@/db";
import {
  qaCoverageFeatures,
  qaCoverageTestLinks,
  type NewQaCoverageTestLink,
} from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";

const FEATURE_TAG_RE = /@feature:([a-zA-Z0-9._-]+)/g;

export function extractFeatureTags(title: string): string[] {
  const matches = title.matchAll(FEATURE_TAG_RE);
  return Array.from(new Set(Array.from(matches, (m) => m[1])));
}

type TestCaseForLink = {
  title: string;
  file: string | null;
  status: string;
};

/**
 * 주어진 run의 test cases에서 @feature: 태그를 추출하여
 * qa_coverage_test_links에 upsert, 매칭된 feature의 coverage_status 업데이트.
 */
export async function linkCoverageForRun(
  runId: number,
  suite: string,
  testCases: TestCaseForLink[],
  runAt: Date = new Date(),
): Promise<{ linked: number; updatedFeatures: number }> {
  const tagToCases = new Map<string, TestCaseForLink[]>();
  for (const tc of testCases) {
    for (const tag of extractFeatureTags(tc.title)) {
      if (!tagToCases.has(tag)) tagToCases.set(tag, []);
      tagToCases.get(tag)!.push(tc);
    }
  }
  if (tagToCases.size === 0) return { linked: 0, updatedFeatures: 0 };

  // 현재 등록된 feature 중 해당 태그를 가진 것만 매핑
  const tags = Array.from(tagToCases.keys());
  const features = await db
    .select({ id: qaCoverageFeatures.id, tag: qaCoverageFeatures.tag })
    .from(qaCoverageFeatures)
    .where(inArray(qaCoverageFeatures.tag, tags));

  const featureByTag = new Map(features.map((f) => [f.tag!, f.id]));

  const links: NewQaCoverageTestLink[] = [];
  for (const [tag, cases] of tagToCases) {
    const featureId = featureByTag.get(tag);
    if (!featureId) continue; // 아직 등록 안 된 feature — 무시(수동 등록 시 자동 연결됨)
    for (const tc of cases) {
      links.push({
        featureId,
        testTitle: tc.title,
        testFile: tc.file,
        suite,
        lastRunId: runId,
        lastStatus: tc.status,
        lastRunAt: runAt,
      });
    }
  }

  if (links.length === 0) return { linked: 0, updatedFeatures: 0 };

  for (let i = 0; i < links.length; i += 100) {
    await db
      .insert(qaCoverageTestLinks)
      .values(links.slice(i, i + 100))
      .onConflictDoUpdate({
        target: [
          qaCoverageTestLinks.featureId,
          qaCoverageTestLinks.testTitle,
          qaCoverageTestLinks.testFile,
        ],
        set: {
          suite: sql`excluded.suite`,
          lastRunId: sql`excluded.last_run_id`,
          lastStatus: sql`excluded.last_status`,
          lastRunAt: sql`excluded.last_run_at`,
        },
      });
  }

  // coverage_status 재계산: 연결된 feature의 최근 상태 기반
  const touchedFeatureIds = Array.from(
    new Set(links.map((l) => l.featureId as string)),
  );
  for (const featureId of touchedFeatureIds) {
    const linkStatuses = await db
      .select({ lastStatus: qaCoverageTestLinks.lastStatus })
      .from(qaCoverageTestLinks)
      .where(eq(qaCoverageTestLinks.featureId, featureId));

    const statuses = linkStatuses
      .map((l) => l.lastStatus)
      .filter((s): s is string => Boolean(s));
    const hasPassed = statuses.includes("passed");
    const hasFailed = statuses.includes("failed") || statuses.includes("flaky");
    const nextStatus = hasPassed
      ? hasFailed
        ? "partial"
        : "covered"
      : "partial";

    await db
      .update(qaCoverageFeatures)
      .set({ coverageStatus: nextStatus, updatedAt: new Date() })
      .where(eq(qaCoverageFeatures.id, featureId));
  }

  return { linked: links.length, updatedFeatures: touchedFeatureIds.length };
}
