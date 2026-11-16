import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";
import type { JobStatus } from "@kaol/shared-types";

export const jobs = pgTable("jobs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  status: varchar("status", { length: 32 }).$type<JobStatus>().notNull().default("queued"),
  sourceFilename: varchar("source_filename", { length: 255 }),
  sourceMediaReference: text("source_media_reference"),
  resultReference: text("result_reference"),
  errorCode: varchar("error_code", { length: 100 }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type JobSelectModel = typeof jobs.$inferSelect;
export type JobInsertModel = typeof jobs.$inferInsert;
