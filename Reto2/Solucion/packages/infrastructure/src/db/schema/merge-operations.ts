import { index, jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { actorKindEnum } from "./enums.js";
import { contacts } from "./contacts.js";
import { ownerIdColumn, stateColumn, timestamps, uuidPk } from "./_shared.js";

/**
 * UC-04/UC-16. `victimSnapshots` conserva el estado exacto previo de cada
 * víctima para que el deshacer sea posible indefinidamente (ADR-21: nada
 * se purga, no hay ventana de retención).
 */
export const mergeOperations = pgTable(
  "merge_operations",
  {
    id: uuidPk(),
    ownerId: ownerIdColumn(),
    survivorContactId: uuid("survivor_contact_id")
      .notNull()
      .references(() => contacts.id),
    victimSnapshots: jsonb("victim_snapshots").$type<unknown[]>().notNull(),
    actorKind: actorKindEnum("actor_kind").notNull(),
    actorId: uuid("actor_id"),
    undoneAt: timestamp("undone_at", { withTimezone: true }),
    state: stateColumn(),
    ...timestamps(),
  },
  (table) => [index("merge_operations_survivor_idx").on(table.survivorContactId)],
);
