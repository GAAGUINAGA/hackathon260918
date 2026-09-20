import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { pushStateEnum } from "./enums.js";
import { integrationAccounts } from "./integration-accounts.js";
import { contacts } from "./contacts.js";
import { ownerIdColumn, stateColumn, timestamps, uuidPk } from "./_shared.js";

export interface PushedEtagEntry {
  readonly etag: string;
  readonly at: string;
}

/**
 * Procedencia por proveedor (UC-05/UC-06). `pushedEtags` es el conjunto
 * acotado de supresión de eco: columna JSONB en el vínculo, no tabla propia
 * (RT-04 §4.2) — una tabla de etags no podría purgar filas bajo ADR-21 y
 * crecería indefinidamente.
 */
export const contactLinks = pgTable(
  "contact_links",
  {
    id: uuidPk(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    integrationAccountId: uuid("integration_account_id")
      .notNull()
      .references(() => integrationAccounts.id),
    ownerId: ownerIdColumn(),
    remoteId: text("remote_id").notNull(),
    etag: text("etag"),
    pushedEtags: jsonb("pushed_etags").$type<PushedEtagEntry[]>().notNull().default([]),
    pushState: pushStateEnum("push_state").notNull().default("pending"),
    deletedRemotely: boolean("deleted_remotely").notNull().default(false),
    state: stateColumn(),
    ...timestamps(),
  },
  (table) => [
    index("contact_links_contact_id_idx").on(table.contactId),
    // RT-16: un vínculo retirado con el mismo identificador remoto no colisiona.
    uniqueIndex("contact_links_live_idx")
      .on(table.integrationAccountId, table.remoteId)
      .where(sql`${table.state} = true`),
  ],
);
