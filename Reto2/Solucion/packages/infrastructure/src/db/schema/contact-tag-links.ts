import { sql } from "drizzle-orm";
import { pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { contacts } from "./contacts.js";
import { tags } from "./tags.js";
import { ownerIdColumn, stateColumn, timestamps, uuidPk } from "./_shared.js";

/** Asignación múltiple y libre (UC-15). RT-18: se retira en cascada, nunca el contacto. */
export const contactTagLinks = pgTable(
  "contact_tag_links",
  {
    id: uuidPk(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id),
    ownerId: ownerIdColumn(),
    state: stateColumn(),
    ...timestamps(),
  },
  (table) => [
    // RT-16: retirar la relación libera la clave para volver a asignarla.
    uniqueIndex("contact_tag_links_live_idx")
      .on(table.contactId, table.tagId)
      .where(sql`${table.state} = true`),
  ],
);
