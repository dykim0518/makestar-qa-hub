import {
  pgTable,
  text,
  integer,
  bigint,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const testRuns = pgTable(
  "test_runs",
  {
    runId: bigint("run_id", { mode: "number" }).primaryKey(),
    suite: text("suite").notNull(), // cmr | albumbuddy | admin | all
    status: text("status").notNull(), // passed | failed | cancelled
    total: integer("total").notNull().default(0),
    passed: integer("passed").notNull().default(0),
    failed: integer("failed").notNull().default(0),
    flaky: integer("flaky").notNull().default(0),
    skipped: integer("skipped").notNull().default(0),
    durationMs: integer("duration_ms").notNull().default(0),
    triggeredBy: text("triggered_by").notNull().default("push"),
    commitSha: text("commit_sha"),
    branch: text("branch"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_test_runs_suite").on(table.suite),
    index("idx_test_runs_created_at").on(table.createdAt),
  ]
);

export const testCases = pgTable(
  "test_cases",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    runId: bigint("run_id", { mode: "number" })
      .notNull()
      .references(() => testRuns.runId, { onDelete: "cascade" }),
    title: text("title").notNull(),
    file: text("file"),
    project: text("project"),
    status: text("status").notNull(), // passed | failed | flaky | skipped
    durationMs: integer("duration_ms").notNull().default(0),
    errorMessage: text("error_message"),
    errorStack: text("error_stack"),
  },
  (table) => [
    index("idx_test_cases_run_id").on(table.runId),
    index("idx_test_cases_status").on(table.status),
  ]
);

export type TestRun = typeof testRuns.$inferSelect;
export type NewTestRun = typeof testRuns.$inferInsert;
export type TestCase = typeof testCases.$inferSelect;
export type NewTestCase = typeof testCases.$inferInsert;
