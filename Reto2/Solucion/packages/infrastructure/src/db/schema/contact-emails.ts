import { boolean, index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { contacts } from "./contacts.js";
import { ownerIdColumn, stateColumn, timestamps, uuidPk } from "./_shared.js";

/**
 * Valor múltiple etiquetado (UC-01). `emailLocalKey`/`emailDomainKey`
 * sostienen la señal B4 de deduplicación (ADR-18a, UC-03) y se calculan en
 * el dominio al construir el value object — aquí solo se almacenan.
 */
export const contactEmails = pgTable(
  "contact_emails",
  {
    id: uuidPk(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    ownerId: ownerIdColumn(),
    value: text("value").notNull(),
    localPart: text("local_part").notNull(),
    domain: text("domain").notNull(),
    emailLocalKey: text("email_local_key").notNull(),
    emailDomainKey: text("email_domain_key").notNull(),
    isPrincipal: boolean("is_principal").notNull().default(false),
    userLocked: boolean("user_locked").notNull().default(false),
    state: stateColumn(),
    ...timestamps(),
  },
  (table) => [
    index("contact_emails_contact_id_idx").on(table.contactId),
    // B1: correo normalizado idéntico, acotado por owner_id (RT-01).
    index("contact_emails_owner_value_idx").on(table.ownerId, table.value),
    // B4: parte local + dominio emparentado (ADR-18a).
    index("contact_emails_owner_local_domain_idx").on(table.ownerId, table.emailLocalKey, table.emailDomainKey),
  ],
);
