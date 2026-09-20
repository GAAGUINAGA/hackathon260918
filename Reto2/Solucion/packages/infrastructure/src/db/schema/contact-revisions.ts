import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { actorKindEnum, revisionOperationEnum } from "./enums.js";
import { contacts } from "./contacts.js";
import { ownerIdColumn, uuidPk } from "./_shared.js";

/**
 * Auditoría inmutable (RT-10, ADR-11). Exenta de ADR-21: no tiene `state`,
 * y el rol de aplicación pierde `UPDATE`/`DELETE` sobre esta tabla
 * (revocado en `infra/roles`, no solo por disciplina de aplicación).
 * `suggestionId`/`aiModel`/`aiPromptVersion` son reserva IA (ADR-20):
 * columnas nulables, sin FK, siempre nulas hasta F7.
 */
export const contactRevisions = pgTable(
  "contact_revisions",
  {
    id: uuidPk(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    ownerId: ownerIdColumn(),
    actorKind: actorKindEnum("actor_kind").notNull(),
    actorId: uuid("actor_id"),
    operation: revisionOperationEnum("operation").notNull(),
    fieldChanges: jsonb("field_changes").$type<Record<string, { before: unknown; after: unknown }>>().notNull(),
    suggestionId: uuid("suggestion_id"),
    aiModel: text("ai_model"),
    aiPromptVersion: text("ai_prompt_version"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("contact_revisions_contact_id_idx").on(table.contactId),
    // Coherencia de la reserva IA: solo actor_kind='ai' puede poblarlas.
    check(
      "contact_revisions_ai_reserve_chk",
      sql`(${table.suggestionId} IS NULL AND ${table.aiModel} IS NULL AND ${table.aiPromptVersion} IS NULL) OR ${table.actorKind} = 'ai'`,
    ),
  ],
);
