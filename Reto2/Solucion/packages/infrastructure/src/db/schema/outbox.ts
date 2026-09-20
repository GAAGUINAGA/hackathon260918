import { bigserial, index, jsonb, pgTable, timestamp } from "drizzle-orm/pg-core";
import { outboxEventTypeEnum } from "./enums.js";
import { ownerIdColumn } from "./_shared.js";

/**
 * Outbox transaccional (RT-04). Única tabla operativa exenta de ADR-21
 * junto con `contact_revisions`: se purga físicamente por antigüedad
 * (`processedAt` + retención), porque una cola que no puede vaciarse deja
 * de ser una cola (§4.2). El disparador `AFTER INSERT` que emite `NOTIFY`
 * y la purga por antigüedad viven en la migración SQL (Drizzle no expresa
 * triggers), no aquí.
 */
export const outbox = pgTable(
  "outbox",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    ownerId: ownerIdColumn(),
    eventType: outboxEventTypeEnum("event_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [index("outbox_unprocessed_idx").on(table.processedAt, table.createdAt)],
);
