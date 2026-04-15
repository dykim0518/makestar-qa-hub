import { AppHeader } from "@/components/AppHeader";
import { CoverageContent } from "@/components/CoverageContent";
import { db } from "@/db";
import { qaCoverageFeatures, qaCoverageTestLinks } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type CoverageLink = {
  id: string;
  featureId: string;
  testTitle: string;
  testFile: string | null;
  suite: string;
  lastStatus: string | null;
  lastRunAt: Date | null;
};

type CoverageFeatureRow = {
  id: string;
  product: string;
  category: string | null;
  pagePath: string;
  pageTitle: string | null;
  featureName: string;
  priority: string;
  coverageStatus: string;
  source: string;
  tag: string | null;
  displayOrder: number;
  linkCount: number;
  lastRunAt: Date | null;
  lastStatus: string | null;
  links: CoverageLink[];
};

async function getCoverage(): Promise<CoverageFeatureRow[]> {
  const [features, allLinks] = await Promise.all([
    db
      .select()
      .from(qaCoverageFeatures)
      .where(eq(qaCoverageFeatures.isActive, true))
      .orderBy(
        qaCoverageFeatures.product,
        qaCoverageFeatures.displayOrder,
        qaCoverageFeatures.pagePath,
      ),
    db.select().from(qaCoverageTestLinks),
  ]);

  const linksByFeature = new Map<string, CoverageLink[]>();
  for (const l of allLinks) {
    const arr = linksByFeature.get(l.featureId) ?? [];
    arr.push({
      id: l.id,
      featureId: l.featureId,
      testTitle: l.testTitle,
      testFile: l.testFile,
      suite: l.suite,
      lastStatus: l.lastStatus,
      lastRunAt: l.lastRunAt,
    });
    linksByFeature.set(l.featureId, arr);
  }

  return features.map((f) => {
    const links = (linksByFeature.get(f.id) ?? []).sort(
      (a, b) => (b.lastRunAt?.getTime() ?? 0) - (a.lastRunAt?.getTime() ?? 0),
    );
    return {
      id: f.id,
      product: f.product,
      category: f.category,
      pagePath: f.pagePath,
      pageTitle: f.pageTitle,
      featureName: f.featureName,
      priority: f.priority,
      coverageStatus: f.coverageStatus,
      source: f.source,
      tag: f.tag,
      displayOrder: f.displayOrder,
      linkCount: links.length,
      lastRunAt: links[0]?.lastRunAt ?? null,
      lastStatus: links[0]?.lastStatus ?? null,
      links,
    };
  });
}

export default async function CoveragePage() {
  const rows = await getCoverage().catch((err) => {
    console.error("coverage fetch failed:", err);
    return [] as CoverageFeatureRow[];
  });

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AppHeader active="coverage" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <CoverageContent rows={rows} />
      </main>
    </div>
  );
}

export type { CoverageFeatureRow, CoverageLink };
