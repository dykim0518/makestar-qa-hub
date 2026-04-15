/**
 * 커버리지 기능 inventory 일괄 import.
 *
 * 입력: JSON 배열 [{ product, category, pagePath, pageTitle, featureName, priority,
 *                    coverageStatus, source, tag, notes }]
 *
 * unique key (product, page_path, feature_name) 기준 upsert.
 *
 * 실행:
 *   npx tsx scripts/import-coverage.ts scripts/coverage-import-menu.json
 */
import * as fs from "fs";
import * as path from "path";
import { db } from "../src/db";
import { qaCoverageFeatures } from "../src/db/schema";
import { sql } from "drizzle-orm";

type Row = {
  product: string;
  category?: string | null;
  pagePath: string;
  pageTitle?: string | null;
  featureName: string;
  priority?: string;
  coverageStatus?: string;
  source?: string;
  tag?: string | null;
  notes?: string | null;
  displayOrder?: number;
};

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: tsx scripts/import-coverage.ts <input.json>");
    process.exit(1);
  }
  const abs = path.resolve(inputPath);
  const raw = JSON.parse(fs.readFileSync(abs, "utf-8")) as Row[];
  console.log(`importing ${raw.length} rows from ${abs}`);

  let inserted = 0;
  let updated = 0;
  for (let i = 0; i < raw.length; i += 50) {
    const batch = raw.slice(i, i + 50);
    const values = batch.map((r) => ({
      product: r.product,
      category: r.category ?? null,
      pagePath: r.pagePath,
      pageTitle: r.pageTitle ?? null,
      featureName: r.featureName,
      priority: r.priority ?? "medium",
      coverageStatus: r.coverageStatus ?? "none",
      source: r.source ?? "manual",
      tag: r.tag ?? null,
      notes: r.notes ?? null,
      displayOrder: r.displayOrder ?? 0,
    }));
    const result = await db
      .insert(qaCoverageFeatures)
      .values(values)
      .onConflictDoUpdate({
        target: [
          qaCoverageFeatures.product,
          qaCoverageFeatures.pagePath,
          qaCoverageFeatures.featureName,
        ],
        set: {
          category: sql`excluded.category`,
          pageTitle: sql`excluded.page_title`,
          priority: sql`excluded.priority`,
          source: sql`excluded.source`,
          tag: sql`excluded.tag`,
          notes: sql`excluded.notes`,
          displayOrder: sql`excluded.display_order`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: qaCoverageFeatures.id });
    inserted += result.length;
  }
  console.log(`✅ upserted ${inserted} rows`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
