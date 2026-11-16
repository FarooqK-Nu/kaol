import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";
import type { ArtifactType } from "@kaol/shared-types";
import { jobs } from "./jobs";

export const artifacts = pgTable("artifacts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  jobId: varchar("job_id", { length: 64 })
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 32 }).$type<ArtifactType>().notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ArtifactSelectModel = typeof artifacts.$inferSelect;
export type ArtifactInsertModel = typeof artifacts.$inferInsert;
