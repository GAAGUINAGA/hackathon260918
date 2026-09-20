import type {
  ActorContext,
  ContactListPage,
  ContactQueryPort,
  ContactSummaryDTO,
  ListContactsQuery,
} from "@ssot/application";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import type { Database } from "../db/connection.js";
import { contactEmails, contactPhones, contacts } from "../db/schema/index.js";
import { withOwnerTransaction } from "../db/transaction.js";

/**
 * Adaptador de salida (Anillo 2) de `ContactQueryPort` (ADR-19a, UC-11).
 * Nunca activa el opt-in de retirados (RT-15): esta es exactamente la vía
 * que debe permanecer ciega a `state = false` por defecto. El propietario
 * se resuelve de `ActorContext`, nunca de un parámetro del llamador.
 */
export class DrizzleContactQuery implements ContactQueryPort {
  constructor(private readonly db: Database) {}

  async findSummaryById(actor: ActorContext, contactId: string): Promise<ContactSummaryDTO | null> {
    return withOwnerTransaction(this.db, actor, async (tx) => {
      const [row] = await tx
        .select({
          id: contacts.id,
          displayName: contacts.displayName,
          company: contacts.company,
        })
        .from(contacts)
        .where(eq(contacts.id, contactId));
      if (row === undefined) {
        return null;
      }

      const [principalEmail] = await tx
        .select({ value: contactEmails.value })
        .from(contactEmails)
        .where(and(eq(contactEmails.contactId, contactId), eq(contactEmails.isPrincipal, true)))
        .limit(1);
      const [principalPhone] = await tx
        .select({ e164: contactPhones.e164 })
        .from(contactPhones)
        .where(and(eq(contactPhones.contactId, contactId), eq(contactPhones.isPrincipal, true)))
        .limit(1);

      return {
        id: row.id,
        displayName: row.displayName,
        company: row.company,
        primaryEmail: principalEmail?.value ?? null,
        primaryPhone: principalPhone?.e164 ?? null,
      };
    });
  }

  async list(actor: ActorContext, query: ListContactsQuery): Promise<ContactListPage> {
    return withOwnerTransaction(this.db, actor, async (tx) => {
      const conditions = [];
      if (query.cursor !== undefined) {
        conditions.push(gt(contacts.id, query.cursor));
      }
      if (query.searchTerm !== undefined && query.searchTerm.trim().length > 0) {
        // `search_vector` es una columna generada creada por SQL crudo
        // (migración 0001, no por el DSL de Drizzle) para que drizzle-kit no
        // intente re-generarla en un futuro diff de esquema; por eso se
        // referencia por nombre literal en vez de via el objeto `contacts`.
        conditions.push(sql`${sql.raw('"contacts"."search_vector"')} @@ plainto_tsquery('simple', ${query.searchTerm})`);
      }

      const rows = await tx
        .select({ id: contacts.id, displayName: contacts.displayName, company: contacts.company })
        .from(contacts)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(contacts.id))
        .limit(query.limit + 1);

      const hasNextPage = rows.length > query.limit;
      const page = hasNextPage ? rows.slice(0, query.limit) : rows;

      const items: ContactSummaryDTO[] = await Promise.all(
        page.map(async (row) => {
          const [principalEmail] = await tx
            .select({ value: contactEmails.value })
            .from(contactEmails)
            .where(and(eq(contactEmails.contactId, row.id), eq(contactEmails.isPrincipal, true)))
            .limit(1);
          const [principalPhone] = await tx
            .select({ e164: contactPhones.e164 })
            .from(contactPhones)
            .where(and(eq(contactPhones.contactId, row.id), eq(contactPhones.isPrincipal, true)))
            .limit(1);
          return {
            id: row.id,
            displayName: row.displayName,
            company: row.company,
            primaryEmail: principalEmail?.value ?? null,
            primaryPhone: principalPhone?.e164 ?? null,
          };
        }),
      );

      const lastItem = page.at(-1);
      return {
        items,
        nextCursor: hasNextPage && lastItem !== undefined ? lastItem.id : null,
      };
    });
  }
}
