import { boolean, index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { contacts } from "./contacts.js";
import { ownerIdColumn, stateColumn, timestamps, uuidPk } from "./_shared.js";

/** Valor múltiple etiquetado (RT-18: dependiente retirado en cascada con el contacto). */
export const contactAddresses = pgTable(
  "contact_addresses",
  {
    id: uuidPk(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    ownerId: ownerIdColumn(),
    label: text("label"),
    street: text("street"),
    city: text("city"),
    region: text("region"),
    postalCode: text("postal_code"),
    country: text("country"),
    isPrincipal: boolean("is_principal").notNull().default(false),
    userLocked: boolean("user_locked").notNull().default(false),
    state: stateColumn(),
    ...timestamps(),
  },
  (table) => [index("contact_addresses_contact_id_idx").on(table.contactId)],
);
