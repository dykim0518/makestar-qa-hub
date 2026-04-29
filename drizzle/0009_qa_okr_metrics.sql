CREATE TABLE "qa_okr_metrics" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "qa_okr_metrics_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"milestone" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"tc_count" integer NOT NULL,
	"total_defects" integer NOT NULL,
	"open_defects" integer NOT NULL,
	"post_release_defects" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_qa_okr_metrics_milestone" ON "qa_okr_metrics" USING btree ("milestone");--> statement-breakpoint
CREATE INDEX "idx_qa_okr_metrics_period_start" ON "qa_okr_metrics" USING btree ("period_start");