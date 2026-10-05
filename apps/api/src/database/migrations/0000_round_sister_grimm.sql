CREATE TABLE "jobs" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"status" varchar(32) DEFAULT 'queued' NOT NULL,
	"source_filename" varchar(255),
	"source_media_reference" text,
	"result_reference" text,
	"error_code" varchar(100),
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "artifacts" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"job_id" varchar(64) NOT NULL,
	"type" varchar(32) NOT NULL,
	"filename" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;