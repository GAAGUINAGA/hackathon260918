import { boolean, index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { contacts } from "./contacts.js";
import { ownerIdColumn, stateColumn, timestamps, uuidPk } from "./_shared.js";

/**
 * Valor múltiple etiquetado (UC-01). `e164` es nulo mientras
 * `isNormalized = false` (flujo 3c: región no inferible, se conserva en
 * crudo, excluido del emparejamiento exacto B2 de UC-03).
 */
export const contactPhones = pgTable(
  "contact_phones",
  {
    id: uuidPk(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    ownerId: ownerIdColumn(),
    rawInput: text("raw_input").notNull(),
    e164: text("e164"),
    isNormalized: boolean("is_normalized").notNull(),
    isPrincipal: boolean("is_principal").notNull().default(false),
    userLocked: boolean("user_locked").notNull().default(false),
    state: stateColumn(),
    ...timestamps(),
  },
  (table) => [
    index("contact_phones_contact_id_idx").on(table.contactId),
    // B2: teléfono E.164 idéntico, acotado por owner_id (RT-01).
    index("contact_phones_owner_e164_idx").on(table.ownerId, table.e164),
  ],
);
