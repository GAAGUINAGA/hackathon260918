import { sql } from "drizzle-orm";
import { pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { categories } from "./categories.js";
import { contacts } from "./contacts.js";
import { ownerIdColumn, stateColumn, timestamps, uuidPk } from "./_shared.js";

/** Asignación única (UC-15): a lo sumo una categoría viva por contacto. */
export const contactCategoryLinks = pgTable(
  "contact_category_links",
  {
    id: uuidPk(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    ownerId: ownerIdColumn(),
    state: stateColumn(),
    ...timestamps(),
  },
  (table) => [
    // RT-16 + asignación única: a lo sumo una fila viva por contact_id.
    uniqueIndex("contact_category_links_live_idx").on(table.contactId).where(sql`${table.state} = true`),
  ],
);
