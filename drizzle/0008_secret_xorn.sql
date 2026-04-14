CREATE TABLE "qa_coverage_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product" text NOT NULL,
	"category" text,
	"page_path" text NOT NULL,
	"page_title" text,
	"feature_name" text NOT NULL,
	"description" text,
	"priority" text DEFAULT 'medium' NOT NULL,
	"coverage_status" text DEFAULT 'none' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"tag" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qa_coverage_test_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_id" uuid NOT NULL,
	"test_title" text NOT NULL,
	"test_file" text,
	"suite" text NOT NULL,
	"last_run_id" bigint,
	"last_status" text,
	"last_run_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qa_coverage_test_links" ADD CONSTRAINT "qa_coverage_test_links_feature_id_qa_coverage_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."qa_coverage_features"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_coverage_test_links" ADD CONSTRAINT "qa_coverage_test_links_last_run_id_test_runs_run_id_fk" FOREIGN KEY ("last_run_id") REFERENCES "public"."test_runs"("run_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_qa_coverage_features_product_path_feature" ON "qa_coverage_features" USING btree ("product","page_path","feature_name");--> statement-breakpoint
CREATE INDEX "idx_qa_coverage_features_product" ON "qa_coverage_features" USING btree ("product");--> statement-breakpoint
CREATE INDEX "idx_qa_coverage_features_status" ON "qa_coverage_features" USING btree ("coverage_status");--> statement-breakpoint
CREATE INDEX "idx_qa_coverage_features_tag" ON "qa_coverage_features" USING btree ("tag");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_qa_coverage_test_links_feature_title_file" ON "qa_coverage_test_links" USING btree ("feature_id","test_title","test_file");--> statement-breakpoint
CREATE INDEX "idx_qa_coverage_test_links_feature" ON "qa_coverage_test_links" USING btree ("feature_id");--> statement-breakpoint
CREATE INDEX "idx_qa_coverage_test_links_suite" ON "qa_coverage_test_links" USING btree ("suite");