import { sql } from "drizzle-orm";
import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { ownerIdColumn, stateColumn, timestamps, uuidPk } from "./_shared.js";

/**
 * Módulo de soporte, servicio delgado sin puertos (ADR-01, UC-15).
 * Taxonomía de un nivel; la asignación única al contacto la impone
 * `contact_category_links` (índice único parcial por `contact_id`).
 */
export const categories = pgTable(
  "categories",
  {
    id: uuidPk(),
    ownerId: ownerIdColumn(),
    name: text("name").notNull(),
    nameNormalized: text("name_normalized").notNull(),
    state: stateColumn(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("categories_owner_name_normalized_live_idx")
      .on(table.ownerId, table.nameNormalized)
      .where(sql`${table.state} = true`),
  ],
);
