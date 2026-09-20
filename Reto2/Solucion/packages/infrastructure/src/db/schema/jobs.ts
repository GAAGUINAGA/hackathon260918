import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { jobStatusEnum, jobTypeEnum } from "./enums.js";
import { integrationAccounts } from "./integration-accounts.js";
import { ownerIdColumn, stateColumn, timestamps, uuidPk } from "./_shared.js";

/** UC-19: progreso y estado de trabajos asíncronos (sync/import/export/dedupe). */
export const jobs = pgTable(
  "jobs",
  {
    id: uuidPk(),
    ownerId: ownerIdColumn(),
    jobType: jobTypeEnum("job_type").notNull(),
    status: jobStatusEnum("status").notNull().default("queued"),
    progress: jsonb("progress").$type<Record<string, unknown>>(),
    error: text("error"),
    integrationAccountId: uuid("integration_account_id").references(() => integrationAccounts.id),
    state: stateColumn(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [index("jobs_owner_status_idx").on(table.ownerId, table.status)],
);
