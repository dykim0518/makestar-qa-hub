import {
  pgTable,
  text,
  integer,
  bigint,
  timestamp,
  index,
  uniqueIndex,
  uuid,
  jsonb,
  boolean,
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
    environment: text("environment").notNull().default("prod"), // prod | stg
    commitSha: text("commit_sha"),
    branch: text("branch"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_test_runs_suite").on(table.suite),
    index("idx_test_runs_created_at").on(table.createdAt),
  ],
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
    errorCategory: text("error_category"),
  },
  (table) => [
    index("idx_test_cases_run_id").on(table.runId),
    index("idx_test_cases_status").on(table.status),
  ],
);

export const tcProjects = pgTable(
  "tc_projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    ownerUserId: text("owner_user_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_tc_projects_owner_user").on(table.ownerUserId)],
);

export const tcSources = pgTable(
  "tc_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => tcProjects.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(), // notion | pdf | figma | google_sheet_template
    sourceRef: text("source_ref").notNull(),
    sourceTitle: text("source_title"),
    sourceStatus: text("source_status").notNull().default("collected"), // collected | normalized | failed
    rawContent: jsonb("raw_content"),
    extractedText: text("extracted_text"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_tc_sources_project").on(table.projectId),
    index("idx_tc_sources_type").on(table.sourceType),
  ],
);

export const tcRequirements = pgTable(
  "tc_requirements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => tcProjects.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id").references(() => tcSources.id, {
      onDelete: "set null",
    }),
    requirementKey: text("requirement_key"),
    title: text("title").notNull(),
    feature: text("feature"),
    action: text("action"),
    expected: text("expected"),
    preCondition: text("pre_condition"),
    body: text("body").notNull(),
    tags: text("tags").array().notNull().default([]),
    priority: text("priority"),
    reviewStatus: text("review_status").notNull().default("draft"), // draft | reviewed | approved
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_tc_requirements_project").on(table.projectId),
    index("idx_tc_requirements_source").on(table.sourceId),
    index("idx_tc_requirements_review_status").on(table.reviewStatus),
  ],
);

export const tcTemplateProfiles = pgTable(
  "tc_template_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => tcProjects.id, { onDelete: "cascade" }),
    sourceRef: text("source_ref"),
    name: text("name").notNull(),
    status: text("status").notNull().default("draft"), // draft | approved
    headerRowIndex: integer("header_row_index").notNull(),
    columnMapping: jsonb("column_mapping").notNull(),
    styleProfile: jsonb("style_profile").notNull(),
    previewRows: jsonb("preview_rows"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_tc_template_profiles_project").on(table.projectId),
    index("idx_tc_template_profiles_status").on(table.status),
  ],
);

export const tcGenerationRuns = pgTable(
  "tc_generation_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => tcProjects.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").references(() => tcTemplateProfiles.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("queued"), // queued | running | failed | completed
    mode: text("mode").notNull().default("draft"), // draft | strict
    totalCases: integer("total_cases").notNull().default(0),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_tc_generation_runs_project").on(table.projectId),
    index("idx_tc_generation_runs_status").on(table.status),
  ],
);

export const tcGeneratedCases = pgTable(
  "tc_generated_cases",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    runId: uuid("run_id")
      .notNull()
      .references(() => tcGenerationRuns.id, { onDelete: "cascade" }),
    requirementId: uuid("requirement_id").references(() => tcRequirements.id, {
      onDelete: "set null",
    }),
    no: text("no"),
    traceability: text("traceability"),
    depth1: text("depth1"),
    depth2: text("depth2"),
    depth3: text("depth3"),
    preCondition: text("pre_condition"),
    step: text("step").notNull(),
    expectedResult: text("expected_result").notNull(),
    result: text("result").notNull().default("Not Test"),
    issueKey: text("issue_key"),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_tc_generated_cases_run").on(table.runId),
    index("idx_tc_generated_cases_requirement").on(table.requirementId),
  ],
);

export const tcValidationIssues = pgTable(
  "tc_validation_issues",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    runId: uuid("run_id")
      .notNull()
      .references(() => tcGenerationRuns.id, { onDelete: "cascade" }),
    issueType: text("issue_type").notNull(), // duplicate | missing | format
    severity: text("severity").notNull().default("medium"), // low | medium | high
    targetRef: text("target_ref"),
    message: text("message").notNull(),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_tc_validation_issues_run").on(table.runId),
    index("idx_tc_validation_issues_type").on(table.issueType),
  ],
);

export const qaAppConfigs = pgTable(
  "qa_app_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => tcProjects.id, { onDelete: "cascade" }),
    productName: text("product_name").notNull(),
    baseUrl: text("base_url").notNull(),
    authType: text("auth_type").notNull(), // none | form | cookie | oauth_manual
    allowedDomains: text("allowed_domains").array().notNull().default([]),
    blockedPaths: text("blocked_paths").array().notNull().default([]),
    readOnlyMode: boolean("read_only_mode").notNull().default(true),
    redactSensitiveData: boolean("redact_sensitive_data")
      .notNull()
      .default(true),
    artifactRetentionDays: integer("artifact_retention_days")
      .notNull()
      .default(14),
    testDataNotes: text("test_data_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_qa_app_configs_project").on(table.projectId),
    index("idx_qa_app_configs_product_name").on(table.productName),
  ],
);

export const qaEnvironments = pgTable(
  "qa_environments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => tcProjects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    baseUrl: text("base_url").notNull(),
    secretRef: text("secret_ref"),
    bootstrapMode: text("bootstrap_mode").notNull().default("none"), // none | cookie_json | api_login | manual
    resetStrategy: text("reset_strategy").notNull().default("none"), // none | seed_api | db_hook | manual
    isDefault: boolean("is_default").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_qa_environments_project_name").on(
      table.projectId,
      table.name,
    ),
    index("idx_qa_environments_project").on(table.projectId),
    index("idx_qa_environments_is_default").on(table.isDefault),
  ],
);

export const qaJourneys = pgTable(
  "qa_journeys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => tcProjects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    goal: text("goal").notNull(),
    startUrl: text("start_url"),
    priority: text("priority").notNull().default("medium"), // high | medium | low
    status: text("status").notNull().default("draft"), // draft | approved | archived
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_qa_journeys_project").on(table.projectId),
    index("idx_qa_journeys_status").on(table.status),
  ],
);

export const qaCaseSnapshots = pgTable(
  "qa_case_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => tcProjects.id, { onDelete: "cascade" }),
    sourceGeneratedCaseId: integer("source_generated_case_id").references(
      () => tcGeneratedCases.id,
      { onDelete: "set null" },
    ),
    journeyId: uuid("journey_id").references(() => qaJourneys.id, {
      onDelete: "set null",
    }),
    caseFingerprint: text("case_fingerprint").notNull(),
    revision: integer("revision").notNull().default(1),
    title: text("title").notNull(),
    preCondition: text("pre_condition"),
    step: text("step").notNull(),
    expectedResult: text("expected_result").notNull(),
    riskLevel: text("risk_level").notNull().default("medium"), // high | medium | low
    approvalStatus: text("approval_status").notNull().default("draft"), // draft | approved | rejected | archived
    executionEnabled: boolean("execution_enabled").notNull().default(false),
    executionPlan: jsonb("execution_plan"),
    approvedBy: text("approved_by"),
    approvalNotes: text("approval_notes"),
    supersedesSnapshotId: uuid("supersedes_snapshot_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_qa_case_snapshots_project_fingerprint_revision").on(
      table.projectId,
      table.caseFingerprint,
      table.revision,
    ),
    index("idx_qa_case_snapshots_project").on(table.projectId),
    index("idx_qa_case_snapshots_approval_status").on(table.approvalStatus),
    index("idx_qa_case_snapshots_journey").on(table.journeyId),
  ],
);

export const qaExecutionRuns = pgTable(
  "qa_execution_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => tcProjects.id, { onDelete: "cascade" }),
    environmentId: uuid("environment_id")
      .notNull()
      .references(() => qaEnvironments.id, { onDelete: "restrict" }),
    triggerType: text("trigger_type").notNull().default("manual"), // manual | scheduled | api
    queueName: text("queue_name").notNull().default("default"),
    status: text("status").notNull().default("queued"), // queued | running | failed | completed | cancelled
    requestedBy: text("requested_by"),
    workerId: text("worker_id"),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    heartbeatAt: timestamp("heartbeat_at"),
    leaseExpiresAt: timestamp("lease_expires_at"),
    configSnapshot: jsonb("config_snapshot"),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    cancelledAt: timestamp("cancelled_at"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_qa_execution_runs_project").on(table.projectId),
    index("idx_qa_execution_runs_environment").on(table.environmentId),
    index("idx_qa_execution_runs_status").on(table.status),
    index("idx_qa_execution_runs_lease_expires_at").on(table.leaseExpiresAt),
  ],
);

export const qaExecutionCases = pgTable(
  "qa_execution_cases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    executionRunId: uuid("execution_run_id")
      .notNull()
      .references(() => qaExecutionRuns.id, { onDelete: "cascade" }),
    caseSnapshotId: uuid("case_snapshot_id").references(
      () => qaCaseSnapshots.id,
      {
        onDelete: "set null",
      },
    ),
    sourceGeneratedCaseId: integer("source_generated_case_id").references(
      () => tcGeneratedCases.id,
      { onDelete: "set null" },
    ),
    playwrightSpecPath: text("playwright_spec_path"),
    status: text("status").notNull().default("queued"), // queued | running | passed | failed | flaky | skipped
    errorCategory: text("error_category"),
    errorFingerprint: text("error_fingerprint"),
    reproSummary: text("repro_summary"),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_qa_execution_cases_run").on(table.executionRunId),
    index("idx_qa_execution_cases_status").on(table.status),
    index("idx_qa_execution_cases_snapshot").on(table.caseSnapshotId),
    index("idx_qa_execution_cases_error_fingerprint").on(
      table.errorFingerprint,
    ),
  ],
);

export const qaExecutionArtifacts = pgTable(
  "qa_execution_artifacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    executionCaseId: uuid("execution_case_id")
      .notNull()
      .references(() => qaExecutionCases.id, { onDelete: "cascade" }),
    artifactType: text("artifact_type").notNull(), // screenshot | trace | video | console | network | html
    storageUrl: text("storage_url").notNull(),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_qa_execution_artifacts_case").on(table.executionCaseId),
    index("idx_qa_execution_artifacts_type").on(table.artifactType),
  ],
);

export const qaIssueDrafts = pgTable(
  "qa_issue_drafts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    executionCaseId: uuid("execution_case_id")
      .notNull()
      .references(() => qaExecutionCases.id, { onDelete: "cascade" }),
    jiraProjectKey: text("jira_project_key").notNull(),
    issueFingerprint: text("issue_fingerprint").notNull(),
    dedupeWindowKey: text("dedupe_window_key").notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    duplicateOfIssueKey: text("duplicate_of_issue_key"),
    jiraIssueKey: text("jira_issue_key"),
    status: text("status").notNull().default("draft"), // draft | submitted | skipped
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_qa_issue_drafts_case").on(table.executionCaseId),
    index("idx_qa_issue_drafts_issue_fingerprint").on(table.issueFingerprint),
    index("idx_qa_issue_drafts_dedupe_window_key").on(table.dedupeWindowKey),
    index("idx_qa_issue_drafts_status").on(table.status),
  ],
);

export type TestRun = typeof testRuns.$inferSelect;
export type NewTestRun = typeof testRuns.$inferInsert;
export type TestCase = typeof testCases.$inferSelect;
export type NewTestCase = typeof testCases.$inferInsert;
export type TcProject = typeof tcProjects.$inferSelect;
export type NewTcProject = typeof tcProjects.$inferInsert;
export type TcSource = typeof tcSources.$inferSelect;
export type NewTcSource = typeof tcSources.$inferInsert;
export type TcRequirement = typeof tcRequirements.$inferSelect;
export type NewTcRequirement = typeof tcRequirements.$inferInsert;
export type TcTemplateProfile = typeof tcTemplateProfiles.$inferSelect;
export type NewTcTemplateProfile = typeof tcTemplateProfiles.$inferInsert;
export type TcGenerationRun = typeof tcGenerationRuns.$inferSelect;
export type NewTcGenerationRun = typeof tcGenerationRuns.$inferInsert;
export type TcGeneratedCase = typeof tcGeneratedCases.$inferSelect;
export type NewTcGeneratedCase = typeof tcGeneratedCases.$inferInsert;
export type TcValidationIssue = typeof tcValidationIssues.$inferSelect;
export type NewTcValidationIssue = typeof tcValidationIssues.$inferInsert;
export type QaAppConfig = typeof qaAppConfigs.$inferSelect;
export type NewQaAppConfig = typeof qaAppConfigs.$inferInsert;
export type QaEnvironment = typeof qaEnvironments.$inferSelect;
export type NewQaEnvironment = typeof qaEnvironments.$inferInsert;
export type QaJourney = typeof qaJourneys.$inferSelect;
export type NewQaJourney = typeof qaJourneys.$inferInsert;
export type QaCaseSnapshot = typeof qaCaseSnapshots.$inferSelect;
export type NewQaCaseSnapshot = typeof qaCaseSnapshots.$inferInsert;
export type QaExecutionRun = typeof qaExecutionRuns.$inferSelect;
export type NewQaExecutionRun = typeof qaExecutionRuns.$inferInsert;
export type QaExecutionCase = typeof qaExecutionCases.$inferSelect;
export type NewQaExecutionCase = typeof qaExecutionCases.$inferInsert;
export type QaExecutionArtifact = typeof qaExecutionArtifacts.$inferSelect;
export type NewQaExecutionArtifact = typeof qaExecutionArtifacts.$inferInsert;
export type QaIssueDraft = typeof qaIssueDrafts.$inferSelect;
export type NewQaIssueDraft = typeof qaIssueDrafts.$inferInsert;

export const qaCoverageFeatures = pgTable(
  "qa_coverage_features",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    product: text("product").notNull(), // cmr | albumbuddy | admin
    category: text("category"),
    pagePath: text("page_path").notNull(),
    pageTitle: text("page_title"),
    featureName: text("feature_name").notNull(),
    description: text("description"),
    priority: text("priority").notNull().default("medium"), // critical | high | medium | low
    coverageStatus: text("coverage_status").notNull().default("none"), // covered | partial | none | manual_only
    source: text("source").notNull().default("manual"), // auto_crawl | manual | hybrid
    tag: text("tag"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_qa_coverage_features_product_path_feature").on(
      table.product,
      table.pagePath,
      table.featureName,
    ),
    index("idx_qa_coverage_features_product").on(table.product),
    index("idx_qa_coverage_features_status").on(table.coverageStatus),
    index("idx_qa_coverage_features_tag").on(table.tag),
    index("idx_qa_coverage_features_display_order").on(table.displayOrder),
  ],
);

export const qaCoverageTestLinks = pgTable(
  "qa_coverage_test_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    featureId: uuid("feature_id")
      .notNull()
      .references(() => qaCoverageFeatures.id, { onDelete: "cascade" }),
    testTitle: text("test_title").notNull(),
    testFile: text("test_file"),
    suite: text("suite").notNull(), // cmr | albumbuddy | admin
    lastRunId: bigint("last_run_id", { mode: "number" }).references(
      () => testRuns.runId,
      { onDelete: "set null" },
    ),
    lastStatus: text("last_status"), // passed | failed | flaky | skipped | heuristic
    linkSource: text("link_source").notNull().default("real"), // real | heuristic | manual
    lastRunAt: timestamp("last_run_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_qa_coverage_test_links_feature_title_file").on(
      table.featureId,
      table.testTitle,
      table.testFile,
    ),
    index("idx_qa_coverage_test_links_feature").on(table.featureId),
    index("idx_qa_coverage_test_links_suite").on(table.suite),
    index("idx_qa_coverage_test_links_source").on(table.linkSource),
  ],
);

export type QaCoverageFeature = typeof qaCoverageFeatures.$inferSelect;
export type NewQaCoverageFeature = typeof qaCoverageFeatures.$inferInsert;
export type QaCoverageTestLink = typeof qaCoverageTestLinks.$inferSelect;
export type NewQaCoverageTestLink = typeof qaCoverageTestLinks.$inferInsert;
