import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, real, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { blockingKeyEnum, candidateStatusEnum } from "./enums.js";
import { contacts } from "./contacts.js";
import { ownerIdColumn, stateColumn, timestamps, uuidPk } from "./_shared.js";

/**
 * Pares candidatos de UC-03 (motor de deduplicación determinista).
 * `contactIdLow < contactIdHigh` es la clave canónica que impide insertar
 * el mismo par dos veces (RT-16, índice único parcial `WHERE state`).
 * `identityFingerprint` sostiene la supresión de reaparición de UC-17.
 */
export const duplicateCandidates = pgTable(
  "duplicate_candidates",
  {
    id: uuidPk(),
    ownerId: ownerIdColumn(),
    contactIdLow: uuid("contact_id_low")
      .notNull()
      .references(() => contacts.id),
    contactIdHigh: uuid("contact_id_high")
      .notNull()
      .references(() => contacts.id),
    score: real("score").notNull(),
    signals: jsonb("signals").$type<Array<{ code: string; weight: number; description: string }>>().notNull(),
    blockingKey: blockingKeyEnum("blocking_key").notNull(),
    status: candidateStatusEnum("status").notNull().default("pending"),
    identityFingerprint: jsonb("identity_fingerprint").$type<Record<string, unknown>>(),
    state: stateColumn(),
    ...timestamps(),
  },
  (table) => [
    index("duplicate_candidates_owner_idx").on(table.ownerId),
    check("duplicate_candidates_canonical_order_chk", sql`${table.contactIdLow} < ${table.contactIdHigh}`),
    uniqueIndex("duplicate_candidates_pair_live_idx")
      .on(table.contactIdLow, table.contactIdHigh)
      .where(sql`${table.state} = true`),
  ],
);
