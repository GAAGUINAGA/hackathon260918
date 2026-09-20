import { sql } from "drizzle-orm";
import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { ownerIdColumn, stateColumn, timestamps, uuidPk } from "./_shared.js";

/**
 * Módulo de soporte, servicio delgado sin puertos (ADR-01, UC-15).
 * Asignación múltiple y libre. Único índice parcial `WHERE state` (RT-16):
 * retirar una etiqueta y crear otra con el mismo nombre no colisiona.
 */
export const tags = pgTable(
  "tags",
  {
    id: uuidPk(),
    ownerId: ownerIdColumn(),
    name: text("name").notNull(),
    nameNormalized: text("name_normalized").notNull(),
    state: stateColumn(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("tags_owner_name_normalized_live_idx")
      .on(table.ownerId, table.nameNormalized)
      .where(sql`${table.state} = true`),
  ],
);
