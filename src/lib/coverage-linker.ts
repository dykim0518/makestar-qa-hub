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
 * tag는 test title 문자열 또는 Playwright JSON metadata(tags)에서 들어온다.
 */
import { db } from "@/db";
import {
  qaCoverageFeatures,
  qaCoverageTestLinks,
  type NewQaCoverageTestLink,
} from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { extractFeatureTags, extractFeatureTagsFromList } from "./coverage-tag";
import { computeCoverageStatus } from "./coverage-status";

export { extractFeatureTags, extractFeatureTagsFromList };

type TestCaseForLink = {
  title: string;
  file: string | null;
  status: string;
  tags?: string[];
};

export async function recomputeCoverageFeatures(
  featureIds: Iterable<string>,
): Promise<number> {
  const uniqueIds = Array.from(new Set(featureIds)).filter(Boolean);
  for (const featureId of uniqueIds) {
    const all = await db
      .select({
        status: qaCoverageTestLinks.lastStatus,
        src: qaCoverageTestLinks.linkSource,
      })
      .from(qaCoverageTestLinks)
      .where(eq(qaCoverageTestLinks.featureId, featureId));

    const next = computeCoverageStatus(
      all.map((link) => ({
        status: link.status,
        source:
          (link.src as "heuristic" | "manual" | "real" | "tag") ?? "real",
      })),
    );

    await db
      .update(qaCoverageFeatures)
      .set({ coverageStatus: next, updatedAt: new Date() })
      .where(eq(qaCoverageFeatures.id, featureId));
  }
  return uniqueIds.length;
}

/**
 * 주어진 run의 test cases에서 @feature: 태그를 추출하여
 * qa_coverage_test_links에 upsert, 매칭된 feature의 coverage_status 업데이트.
 */
export async function linkCoverageForRun(
  runId: number,
  suite: string,
  testCases: TestCaseForLink[],
  runAt: Date = new Date(),
  options: { reconcile?: boolean } = {},
): Promise<{ linked: number; updatedFeatures: number; staleRemoved: number }> {
  const tagToCases = new Map<string, TestCaseForLink[]>();
  for (const tc of testCases) {
    const featureTags = new Set([
      ...extractFeatureTags(tc.title),
      ...extractFeatureTagsFromList(tc.tags ?? []),
    ]);
    for (const tag of featureTags) {
      if (!tagToCases.has(tag)) tagToCases.set(tag, []);
      tagToCases.get(tag)!.push(tc);
    }
  }
  if (tagToCases.size === 0)
    return { linked: 0, updatedFeatures: 0, staleRemoved: 0 };

  // 현재 등록된 feature 중 해당 태그를 가진 것만 매핑
  const tags = Array.from(tagToCases.keys());
  const features = await db
    .select({ id: qaCoverageFeatures.id, tag: qaCoverageFeatures.tag })
    .from(qaCoverageFeatures)
    .where(inArray(qaCoverageFeatures.tag, tags));

  const featureByTag = new Map(features.map((f) => [f.tag!, f.id]));

  // 이번 run에 등장한 모든 testFile + (testFile, testTitle) 조합 수집.
  // reconciliation에서 "이번 run에 없는 old real link"를 stale로 판정할 때 사용.
  const runFiles = new Set<string>();
  const runTestKeys = new Set<string>();
  for (const tc of testCases) {
    const file = tc.file ? tc.file.replace(/^tests\//, "") : null;
    if (file) {
      runFiles.add(file);
      runTestKeys.add(`${file}::${tc.title}`);
    }
  }

  const links: NewQaCoverageTestLink[] = [];
  const affectedFiles = new Set<string>();
  for (const [tag, cases] of tagToCases) {
    const featureId = featureByTag.get(tag);
    if (!featureId) continue;
    for (const tc of cases) {
      // testFile 정규화: tests/ 접두사 제거
      const normalizedFile = tc.file ? tc.file.replace(/^tests\//, "") : null;
      links.push({
        featureId,
        testTitle: tc.title,
        testFile: normalizedFile,
        suite,
        lastRunId: runId,
        lastStatus: tc.status,
        linkSource: "real",
        lastRunAt: runAt,
      });
      if (normalizedFile) affectedFiles.add(normalizedFile);
    }
  }

  if (links.length === 0)
    return { linked: 0, updatedFeatures: 0, staleRemoved: 0 };

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
          linkSource: sql`excluded.link_source`,
          lastRunAt: sql`excluded.last_run_at`,
        },
      });
  }

  // 정적(tag/heuristic) 중복 제거: 이번 run의 real link와 겹치면 정적 링크는 삭제
  for (const real of links) {
    if (!real.testFile) continue;
    const staticLinks = await db
      .select({
        id: qaCoverageTestLinks.id,
        testTitle: qaCoverageTestLinks.testTitle,
      })
      .from(qaCoverageTestLinks)
      .where(
        sql`${qaCoverageTestLinks.featureId} = ${real.featureId}
          AND ${qaCoverageTestLinks.testFile} = ${real.testFile}
          AND ${qaCoverageTestLinks.linkSource} IN ('heuristic', 'tag')`,
      );
    for (const staticLink of staticLinks) {
      if (
        real.testTitle === staticLink.testTitle ||
        real.testTitle.endsWith(` > ${staticLink.testTitle}`)
      ) {
        await db
          .delete(qaCoverageTestLinks)
          .where(eq(qaCoverageTestLinks.id, staticLink.id));
      }
    }
  }

  // Reconciliation: 이번 run에 등장한 파일들의 old real link 중
  // 이번 run에 없는 (testFile, testTitle) 조합은 stale로 판정하고 삭제.
  // — 태그 제거/테스트 삭제/rename 시 자동 정리.
  const staleFeatureIds = new Set<string>();
  if (options.reconcile && runFiles.size > 0) {
    const oldRealLinks = await db
      .select({
        id: qaCoverageTestLinks.id,
        featureId: qaCoverageTestLinks.featureId,
        testTitle: qaCoverageTestLinks.testTitle,
        testFile: qaCoverageTestLinks.testFile,
      })
      .from(qaCoverageTestLinks)
      .where(
        and(
          eq(qaCoverageTestLinks.linkSource, "real"),
          inArray(qaCoverageTestLinks.testFile, Array.from(runFiles)),
        ),
      );
    for (const old of oldRealLinks) {
      const key = `${old.testFile}::${old.testTitle}`;
      if (!runTestKeys.has(key)) {
        await db
          .delete(qaCoverageTestLinks)
          .where(eq(qaCoverageTestLinks.id, old.id));
        staleFeatureIds.add(old.featureId);
      }
    }
  }

  // coverage_status 재계산 (새 규칙: static/manual 분리, skipped-only는 다른 근거로 폴백)
  const touchedFeatureIds = new Set<string>([
    ...links.map((link) => link.featureId as string),
    ...staleFeatureIds,
  ]);
  const updatedFeatures = await recomputeCoverageFeatures(touchedFeatureIds);

  return {
    linked: links.length,
    updatedFeatures,
    staleRemoved: staleFeatureIds.size,
  };
}
