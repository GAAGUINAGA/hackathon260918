import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { contactStatusEnum } from "./enums.js";
import { ownerIdColumn, stateColumn, timestamps, uuidPk, withdrawnAtColumn } from "./_shared.js";

/**
 * Agregado raíz (UC-01). `status` (ciclo de vida) y `state`/`withdrawn_at`
 * (existencia) son mecanismos independientes (planeacion_v.2.1.2 §4.1):
 * una víctima de fusión sigue `state = true` con `status = 'merged'`.
 */
export const contacts = pgTable("contacts", {
  id: uuidPk(),
  ownerId: ownerIdColumn(),
  displayName: text("display_name"),
  company: text("company"),
  title: text("title"),
  notes: text("notes"),
  // Reserva: poblada desde el inicio (planeacion_v.2.1.2 §Reserva arquitectónica).
  notesHash: text("notes_hash"),
  status: contactStatusEnum("status").notNull().default("active"),
  state: stateColumn(),
  withdrawnAt: withdrawnAtColumn(),
  version: integer("version").notNull().default(1),
  ...timestamps(),
});
