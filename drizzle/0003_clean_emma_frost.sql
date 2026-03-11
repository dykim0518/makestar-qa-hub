CREATE TABLE "tc_generated_cases" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tc_generated_cases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"run_id" uuid NOT NULL,
	"requirement_id" uuid,
	"no" text,
	"traceability" text,
	"depth1" text,
	"depth2" text,
	"depth3" text,
	"pre_condition" text,
	"step" text NOT NULL,
	"expected_result" text NOT NULL,
	"result" text DEFAULT 'Not Test' NOT NULL,
	"issue_key" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tc_generation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"profile_id" uuid,
	"status" text DEFAULT 'queued' NOT NULL,
	"mode" text DEFAULT 'draft' NOT NULL,
	"total_cases" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tc_validation_issues" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tc_validation_issues_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"run_id" uuid NOT NULL,
	"issue_type" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"target_ref" text,
	"message" text NOT NULL,
	"meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tc_generated_cases" ADD CONSTRAINT "tc_generated_cases_run_id_tc_generation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."tc_generation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tc_generated_cases" ADD CONSTRAINT "tc_generated_cases_requirement_id_tc_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."tc_requirements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tc_generation_runs" ADD CONSTRAINT "tc_generation_runs_project_id_tc_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."tc_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tc_generation_runs" ADD CONSTRAINT "tc_generation_runs_profile_id_tc_template_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."tc_template_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tc_validation_issues" ADD CONSTRAINT "tc_validation_issues_run_id_tc_generation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."tc_generation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tc_generated_cases_run" ON "tc_generated_cases" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_tc_generated_cases_requirement" ON "tc_generated_cases" USING btree ("requirement_id");--> statement-breakpoint
CREATE INDEX "idx_tc_generation_runs_project" ON "tc_generation_runs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_tc_generation_runs_status" ON "tc_generation_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tc_validation_issues_run" ON "tc_validation_issues" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_tc_validation_issues_type" ON "tc_validation_issues" USING btree ("issue_type");